import { v } from "convex/values";
import { entries } from "../features/entries/model";
import { email } from "../features/email/model";
import { convex } from "../schema";

export const startSubmitting = convex
  .mutation()
  .internal()
  .input({
    userId: v.id("users"),
  })
  .handler(async ({ context, input }) => {
    return await entries
      .mutate(context)
      .forUser(input.userId)
      .startSubmitting(context);
  });

export const finalizeSubmission = convex
  .mutation()
  .internal()
  .input({
    entryId: v.id("entries"),
    lat: v.number(),
    lng: v.number(),
    placeId: v.string(),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    const entry = await entries.query(context).forEntry(input.entryId).get();
    if (!entry) throw new Error(`Entry '${input.entryId}' not found`);

    await entries
      .mutate(context)
      .forUser(entry.submittedByUserId)
      .finalizeSubmission({
        lat: input.lat,
        lng: input.lng,
        placeId: input.placeId,
      });

    await email.sendNewEntryNotificationToCompetitionAdmins(context, {
      entryId: entry._id,
    });

    return null;
  });

export const revertToDraft = convex
  .mutation()
  .internal()
  .input({
    userId: v.id("users"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await entries.mutate(context).forUser(input.userId).revertToDraft();
    return null;
  });
