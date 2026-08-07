import { v } from "convex/values";
import { entries } from "../features/entries/model";
import { email } from "../features/email/model";
import { convex } from "../schema";
import { competitions } from "../features/competitions/model";
import type { MutationCtx } from "../_generated/server";

export const startSubmitting = convex
  .mutation()
  .input({
    userId: v.id("users"),
  })
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    if (!competition.entriesOpen)
      throw new Error("Competition entries are currently closed");
    return await entries
      .mutate(context)
      .forUser(competition._id, input.userId)
      .startSubmitting(context);
  })
  .internal();

export const finalizeSubmission = convex
  .mutation()
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

export const revertToDraft = convex
  .mutation()
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
    const previousEntry = await entries
      .query(context)
      .forUser(entry.submittedByUserId)
      .findPreviousCompetitionApproved(competition._id);
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

export const repairCurrentReturningEntryNumbers = convex
  .mutation()
  .input({})
  .returns(
    v.object({
      repairedCount: v.number(),
      conflictCount: v.number(),
    }),
  )
  .handler(repairCurrentReturningEntryNumbersForContext)
  .internal();
