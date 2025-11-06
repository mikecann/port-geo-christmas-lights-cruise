import { userCompetitionAdminMutation } from "./lib";
import { userCompetitionAdminQuery } from "./lib";
import { entries } from "../../features/entries/model";
import { photos } from "../../features/photos/model";
import { email } from "../../features/email/model";
import { v } from "convex/values";

// Queries

export const listPending = userCompetitionAdminQuery({
  args: {},
  handler: async (ctx) => {
    const pendingEntries = await entries.listPendingReview(ctx.db);

    const entriesWithPhotos = await Promise.all(
      pendingEntries.map(async (entry) => {
        const entryPhotos = await photos.forEntry(entry._id).list(ctx.db);
        return {
          ...entry,
          photos: entryPhotos,
        };
      }),
    );

    return entriesWithPhotos;
  },
});

export const getStats = userCompetitionAdminQuery({
  args: {},
  handler: async (ctx) => {
    return await entries.getStats(ctx.db);
  },
});

export const listApproved = userCompetitionAdminQuery({
  args: {},
  handler: async (ctx) => {
    const approvedEntries = await entries.listApproved(ctx.db);

    const entriesWithPhotos = await Promise.all(
      approvedEntries.map(async (entry) => {
        const entryPhotos = await photos.forEntry(entry._id).list(ctx.db);
        return {
          ...entry,
          photos: entryPhotos,
        };
      }),
    );

    return entriesWithPhotos;
  },
});

export const listRejected = userCompetitionAdminQuery({
  args: {},
  handler: async (ctx) => {
    const rejectedEntries = await entries.listRejected(ctx.db);

    const entriesWithPhotos = await Promise.all(
      rejectedEntries.map(async (entry) => {
        const entryPhotos = await photos.forEntry(entry._id).list(ctx.db);
        return {
          ...entry,
          photos: entryPhotos,
        };
      }),
    );

    return entriesWithPhotos;
  },
});

export const get = userCompetitionAdminQuery({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).get(ctx.db);
    const entryPhotos = await photos.forEntry(args.entryId).list(ctx.db);

    return {
      ...entry,
      photos: entryPhotos,
    };
  },
});

export const getUserDetails = userCompetitionAdminQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      emailVerificationTime: user.emailVerificationTime,
      phoneVerificationTime: user.phoneVerificationTime,
    };
  },
});

export const checkAddressConflicts = userCompetitionAdminQuery({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).get(ctx.db);
    if (!entry.houseAddress || typeof entry.houseAddress !== "object" || !("placeId" in entry.houseAddress)) {
      return { hasConflicts: false };
    }

    const placeId = entry.houseAddress.placeId;
    const hasConflicts = await entries.hasEntryWithPlaceIdAlreadyBeenSubmitted(
      ctx.db,
      placeId,
      args.entryId,
    );

    return { hasConflicts };
  },
});

// Mutations

export const approve = userCompetitionAdminMutation({
  args: {
    entryId: v.id("entries"),
  },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).get(ctx.db);
    const entryNumber = await entries.getNextAvailableEntryNumber(ctx.db);
    await entries.forEntry(args.entryId).approve(ctx.db, { entryNumber });

    const user = await ctx.db.get(entry.submittedByUserId);
    if (!user?.email) return null;

    await email.sendEntryApprovalEmail(ctx, {
      to: user.email,
      entry: await entries.forEntry(args.entryId).get(ctx.db),
      entryNumber,
    });

    return null;
  },
});

export const reject = userCompetitionAdminMutation({
  args: {
    entryId: v.id("entries"),
    rejectedReason: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).get(ctx.db);
    await entries
      .forEntry(args.entryId)
      .reject(ctx.db, { rejectedReason: args.rejectedReason });

    const user = await ctx.db.get(entry.submittedByUserId);
    if (!user?.email) return null;

    await email.sendEntryRejectionEmail(ctx, {
      to: user.email,
      entry: await entries.forEntry(args.entryId).get(ctx.db),
      rejectedReason: args.rejectedReason,
    });

    return null;
  },
});
