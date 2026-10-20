import { ConvexError, v } from "convex/values";
import { ensureStepped, entries } from "../features/entries/model";
import { email } from "../features/email/model";
import { mutation } from "../features/common/lib";
import { competitions } from "../features/competitions/model";
import { entry, machines, type InternalMachineCtx } from "../machines";

// The submit action's steps. Starting is the owner's SUBMIT, sent with their
// auth, which the action passes on. Its results come back as server events,
// which need the catalog's internalMutation.

export const startSubmitting = mutation
  .input({
    userId: v.id("users"),
  })
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    if (!competition.entriesOpen)
      throw new ConvexError("Competition entries are currently closed");
    return await entries
      .mutate(context)
      .forUser(competition._id, input.userId)
      .startSubmitting();
  })
  .internal();

export const finalizeSubmission = machines.internalMutation({
  args: {
    entryId: v.id("entries"),
    lat: v.number(),
    lng: v.number(),
    placeId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { entryId, lat, lng, placeId } = args;
    const current = await entries.query(ctx).forEntry(entryId).get();
    const address = current.state.houseAddress?.address;
    ensureStepped(
      await entry.send(ctx, entryId, { type: "GEOCODED", lat, lng, placeId }),
      {
        NOT_ACCEPTED: `Entry '${entryId}' is not in the submitting status`,
        addressIsFree: `Address ${address} is already used!`,
        withinBoundary: `Address "${address}" is outside the competition area. Entries must be within the Port Geographe/Busselton region.`,
      },
    );

    await email.sendNewEntryNotificationToCompetitionAdmins(ctx, { entryId });

    return null;
  },
});

export const revertToDraft = machines.internalMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const competition = await competitions.query(ctx).current();
    const current = await entries
      .query(ctx)
      .forUser(competition._id, args.userId)
      .get();
    const result = await entry.send(ctx, current._id, {
      type: "SUBMIT_FAILED",
    });
    // Already a draft: its timer sent it back while the submit action was
    // still running, so there's nothing to revert and the action's own error
    // goes back to the entrant.
    if (result.status !== "done" && current.state.kind !== "draft")
      throw new Error(
        `Entry '${current._id}' is not in submitting status, cannot revert`,
      );
    return null;
  },
});

// Deletes the row, from any state. Its photos and votes are the caller's:
// entries.mutate().forEntry().delete() does both.
export const purge = machines.internalMutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await entry.purge(ctx, args.entryId, { force: true });
    return null;
  },
});

export async function repairCurrentReturningEntryNumbersForContext(
  context: InternalMachineCtx,
) {
  const competition = await competitions.query(context).current();
  const approvedEntries = await entries
    .query(context)
    .listApproved(competition._id);
  const currentEntryByNumber = new Map(
    approvedEntries.map((entry) => [entry.state.entryNumber, entry]),
  );
  const pendingRepairs = new Map<
    (typeof approvedEntries)[number]["_id"],
    { entry: (typeof approvedEntries)[number]; entryNumber: number }
  >();

  for (const entry of approvedEntries) {
    const previousEntry = await entries.query(context).findPreviousOf(entry);
    if (
      !previousEntry ||
      previousEntry.state.entryNumber === entry.state.entryNumber
    )
      continue;

    pendingRepairs.set(entry._id, {
      entry,
      entryNumber: previousEntry.state.entryNumber,
    });
  }

  let repairedCount = 0;
  let madeProgress = true;
  while (madeProgress) {
    madeProgress = false;

    // A move can free the number needed by another returning entrant, so keep
    // retrying the remaining repairs until a complete pass makes no progress.
    for (const [entryId, repair] of pendingRepairs) {
      const conflictingEntry = currentEntryByNumber.get(repair.entryNumber);
      if (conflictingEntry && conflictingEntry._id !== entryId) continue;

      currentEntryByNumber.delete(repair.entry.state.entryNumber);
      currentEntryByNumber.set(repair.entryNumber, repair.entry);
      ensureStepped(
        await entry.send(context, entryId, {
          type: "RENUMBER",
          entryNumber: repair.entryNumber,
        }),
      );
      pendingRepairs.delete(entryId);
      repairedCount++;
      madeProgress = true;
    }
  }

  return { repairedCount, conflictCount: pendingRepairs.size };
}

export const repairCurrentReturningEntryNumbers = machines.internalMutation({
  args: {},
  returns: v.object({
    repairedCount: v.number(),
    conflictCount: v.number(),
  }),
  handler: repairCurrentReturningEntryNumbersForContext,
});

// Links entries started before previousEntryId existed, and reserves the
// number they'll keep, so they show it before they're approved
export async function linkReturningEntrantsForContext(
  context: InternalMachineCtx,
) {
  const competition = await competitions.query(context).current();
  const competitionEntries = await context.db
    .query("entries")
    .withIndex("by_competitionId_and_status", (q) =>
      q.eq("competitionId", competition._id),
    )
    .collect();

  let linkedCount = 0;
  for (const current of competitionEntries) {
    if (
      current.previousEntryId !== undefined ||
      current.state.kind === "rejected"
    )
      continue;
    const previousEntry = await entries
      .query(context)
      .forUser(competition._id, current.submittedByUserId)
      .findPreviousApproved();
    if (!previousEntry) continue;

    // previousEntryId is the row's own field, and the number is its state's
    await context.db.patch("entries", current._id, {
      previousEntryId: previousEntry._id,
    });
    if (current.state.entryNumber === undefined) {
      const entryNumber = await entries
        .query(context)
        .findKeepableNumber(competition._id, previousEntry, current._id);
      if (entryNumber !== null)
        ensureStepped(
          await entry.send(context, current._id, {
            type: "RENUMBER",
            entryNumber,
          }),
        );
    }
    linkedCount++;
  }
  return { linkedCount };
}

export const linkReturningEntrants = machines.internalMutation({
  args: {},
  returns: v.object({ linkedCount: v.number() }),
  handler: linkReturningEntrantsForContext,
});
