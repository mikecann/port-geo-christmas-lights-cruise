import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { entries } from "../features/entries/model";
import { email } from "../features/email/model";

export const startSubmitting = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await entries.forUser(args.userId).startSubmitting(ctx);
  },
});

export const finalizeSubmission = internalMutation({
  args: {
    entryId: v.id("entries"),
    lat: v.number(),
    lng: v.number(),
    placeId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).get(ctx.db);
    if (!entry) throw new Error(`Entry '${args.entryId}' not found`);

    await entries.forUser(entry.submittedByUserId).finalizeSubmission(ctx.db, {
      lat: args.lat,
      lng: args.lng,
      placeId: args.placeId,
    });

    await email.sendNewEntryNotificationToCompetitionAdmins(ctx, {
      entryId: entry._id,
    });

    return null;
  },
});

