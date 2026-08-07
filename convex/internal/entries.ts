import { v } from "convex/values";
import { entries } from "../features/entries/model";
import { email } from "../features/email/model";
import { convex } from "../schema";
import { competitions } from "../features/competitions/model";

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

export const repairCurrentReturningEntryNumbers = convex
  .mutation()
  .input({})
  .returns(
    v.object({
      repairedCount: v.number(),
      conflictCount: v.number(),
    }),
  )
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const approvedEntries = await entries
      .query(context)
      .listApproved(competition._id);
    const currentEntryByNumber = new Map(
      approvedEntries.map((entry) => [entry.entryNumber, entry]),
    );
    let repairedCount = 0;
    let conflictCount = 0;

    for (const entry of approvedEntries) {
      const previousEntry = await entries
        .query(context)
        .forUser(entry.submittedByUserId)
        .findMostRecentPreviousApproved(competition._id);
      if (!previousEntry || previousEntry.entryNumber === entry.entryNumber)
        continue;

      const conflictingEntry = currentEntryByNumber.get(
        previousEntry.entryNumber,
      );
      if (conflictingEntry && conflictingEntry._id !== entry._id) {
        conflictCount++;
        continue;
      }

      currentEntryByNumber.delete(entry.entryNumber);
      currentEntryByNumber.set(previousEntry.entryNumber, entry);
      await entries.mutate(context).forEntry(entry._id).setEntryNumber({
        entryNumber: previousEntry.entryNumber,
      });
      repairedCount++;
    }

    return { repairedCount, conflictCount };
  })
  .internal();
