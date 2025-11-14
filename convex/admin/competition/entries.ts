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
    const pendingEntries = await entries.query(ctx).listPendingReview();

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
    return await entries.query(ctx).getStats();
  },
});

export const listApproved = userCompetitionAdminQuery({
  args: {},
  handler: async (ctx) => {
    const approvedEntries = await entries.query(ctx).listApproved();

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
    const rejectedEntries = await entries.query(ctx).listRejected();

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
    const entry = await entries.query(ctx).forEntry(args.entryId).get();
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

export const getEntryValidationStatus = userCompetitionAdminQuery({
  args: { entryId: v.id("entries") },
  returns: v.object({
    hasConflicts: v.boolean(),
    isWithinBoundary: v.union(v.boolean(), v.null()),
    isOnWhitelist: v.union(v.boolean(), v.null()),
  }),
  handler: async (ctx, args) => {
    const entry = await entries.query(ctx).forEntry(args.entryId).get();
    if (
      !entry.houseAddress ||
      typeof entry.houseAddress !== "object" ||
      !("placeId" in entry.houseAddress)
    )
      return {
        hasConflicts: false,
        isWithinBoundary: null,
        isOnWhitelist: null,
      };

    const placeId = entry.houseAddress.placeId;
    const hasConflicts = await entries
      .query(ctx)
      .hasEntryWithPlaceIdAlreadyBeenSubmitted(placeId, args.entryId);

    // Check if location is within competition boundary
    const houseAddress = entry.houseAddress;
    let isWithinBoundary: boolean | null = null;
    if (
      "lat" in houseAddress &&
      "lng" in houseAddress &&
      typeof houseAddress.lat === "number" &&
      typeof houseAddress.lng === "number" &&
      houseAddress.lat !== 0 &&
      houseAddress.lng !== 0
    )
      isWithinBoundary = entries.isLocationWithinCompetitionBoundary(
        houseAddress.lat,
        houseAddress.lng,
      );

    // Check if user email is on whitelist
    const user = await ctx.db.get(entry.submittedByUserId);
    const isOnWhitelist = user
      ? entries.isUserEmailOnWhitelist(user.email)
      : null;

    return { hasConflicts, isWithinBoundary, isOnWhitelist };
  },
});

// Mutations

export const approve = userCompetitionAdminMutation({
  args: {
    entryId: v.id("entries"),
  },
  handler: async (ctx, args) => {
    const entry = await entries.query(ctx).forEntry(args.entryId).get();
    const entryNumber = await entries.mutate(ctx).getNextAvailableEntryNumber();
    await entries.mutate(ctx).forEntry(args.entryId).approve({ entryNumber });

    const user = await ctx.db.get(entry.submittedByUserId);
    if (!user?.email) return null;

    await email.sendEntryApprovalEmail(ctx, {
      to: user.email,
      entry: await entries.query(ctx).forEntry(args.entryId).get(),
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
    const entry = await entries.query(ctx).forEntry(args.entryId).get();
    await entries
      .mutate(ctx)
      .forEntry(args.entryId)
      .reject({ rejectedReason: args.rejectedReason });

    const user = await ctx.db.get(entry.submittedByUserId);
    if (!user?.email) return null;

    await email.sendEntryRejectionEmail(ctx, {
      to: user.email,
      entry: await entries.query(ctx).forEntry(args.entryId).get(),
      rejectedReason: args.rejectedReason,
    });

    return null;
  },
});
