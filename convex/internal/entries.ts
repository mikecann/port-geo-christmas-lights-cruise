import { ConvexError, v } from "convex/values";
import { entries } from "../features/entries/model";
import { email } from "../features/email/model";
import { mutation } from "../features/common/lib";
import { competitions } from "../features/competitions/model";
import type { MutationCtx } from "../_generated/server";

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

export const finalizeSubmission = mutation
  .input({
    entryId: v.id("entries"),
    lat: v.number(),
    lng: v.number(),
    placeId: v.string(),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const entry = await entries.query(context).forEntry(input.entryId).get();
    if (!entry) throw new Error(`Entry '${input.entryId}' not found`);

    await entries
      .mutate(context)
      .forUser(entry.competitionId, entry.submittedByUserId)
      .finalizeSubmission({
        lat: input.lat,
        lng: input.lng,
        placeId: input.placeId,
      });

    await email.sendNewEntryNotificationToCompetitionAdmins(context, {
      entryId: entry._id,
    });

    return null;
  })
  .internal();

export const revertToDraft = mutation
  .input({
    userId: v.id("users"),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await entries
      .mutate(context)
      .forUser(competition._id, input.userId)
      .revertToDraft();
    return null;
  })
  .internal();

export async function repairCurrentReturningEntryNumbersForContext(
  context: MutationCtx,
) {
  const competition = await competitions.query(context).current();
  const approvedEntries = await entries
    .query(context)
    .listApproved(competition._id);
  const currentEntryByNumber = new Map(
    approvedEntries.map((entry) => [entry.entryNumber, entry]),
  );
  const pendingRepairs = new Map<
    (typeof approvedEntries)[number]["_id"],
    { entry: (typeof approvedEntries)[number]; entryNumber: number }
  >();

  for (const entry of approvedEntries) {
    const previousEntry = await entries.query(context).findPreviousOf(entry);
    if (!previousEntry || previousEntry.entryNumber === entry.entryNumber)
      continue;

    pendingRepairs.set(entry._id, {
      entry,
      entryNumber: previousEntry.entryNumber,
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

      currentEntryByNumber.delete(repair.entry.entryNumber);
      currentEntryByNumber.set(repair.entryNumber, repair.entry);
      await entries.mutate(context).forEntry(entryId).setEntryNumber({
        entryNumber: repair.entryNumber,
      });
      pendingRepairs.delete(entryId);
      repairedCount++;
      madeProgress = true;
    }
  }

  return { repairedCount, conflictCount: pendingRepairs.size };
}

export const repairCurrentReturningEntryNumbers = mutation
  .input({})
  .returns(
    v.object({
      repairedCount: v.number(),
      conflictCount: v.number(),
    }),
  )
  .handler(repairCurrentReturningEntryNumbersForContext)
  .internal();

// Links entries started before previousEntryId existed, and reserves the
// number they'll keep, so they show it before they're approved
export async function linkReturningEntrantsForContext(context: MutationCtx) {
  const competition = await competitions.query(context).current();
  const competitionEntries = await context.db
    .query("entries")
    .withIndex("by_competitionId_and_status", (q) =>
      q.eq("competitionId", competition._id),
    )
    .collect();

  let linkedCount = 0;
  for (const entry of competitionEntries) {
    if (entry.previousEntryId !== undefined || entry.status === "rejected")
      continue;
    const previousEntry = await entries
      .query(context)
      .forUser(competition._id, entry.submittedByUserId)
      .findPreviousApproved();
    if (!previousEntry) continue;

    const entryNumber =
      entry.entryNumber ??
      (await entries
        .query(context)
        .findKeepableNumber(competition._id, previousEntry, entry._id));
    await context.db.patch(entry._id, {
      previousEntryId: previousEntry._id,
      ...(entryNumber === null ? {} : { entryNumber }),
    });
    linkedCount++;
  }
  return { linkedCount };
}

export const linkReturningEntrants = mutation
  .input({})
  .returns(v.object({ linkedCount: v.number() }))
  .handler(linkReturningEntrantsForContext)
  .internal();
