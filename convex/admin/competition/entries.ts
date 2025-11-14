import { userCompetitionAdminMutation, userCompetitionAdminQuery } from "./lib";
import { photos } from "../../features/photos/model";
import { email } from "../../features/email/model";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import {
  isLocationWithinCompetitionBoundary,
  isUserEmailOnWhitelist,
} from "../../features/entries/utils";

// Queries

export const listPending = userCompetitionAdminQuery
  .input({})
  .handler(async ({ context }) => {
    const pendingEntries = await context.services.entries.listPendingReview();

    const entriesWithPhotos = await Promise.all(
      pendingEntries.map(async (entry) => {
        const entryPhotos = await photos.forEntry(entry._id).list(context.db);
        return {
          ...entry,
          photos: entryPhotos,
        };
      }),
    );

    return entriesWithPhotos;
  });

export const getStats = userCompetitionAdminQuery
  .input({})
  .handler(async ({ context }) => {
    return await context.services.entries.getStats();
  });

export const listApproved = userCompetitionAdminQuery
  .input({})
  .handler(async ({ context }) => {
    const approvedEntries = await context.services.entries.listApproved();

    const entriesWithPhotos = await Promise.all(
      approvedEntries.map(async (entry) => {
        const entryPhotos = await photos.forEntry(entry._id).list(context.db);
        return {
          ...entry,
          photos: entryPhotos,
        };
      }),
    );

    return entriesWithPhotos;
  });

export const listRejected = userCompetitionAdminQuery
  .input({})
  .handler(async ({ context }) => {
    const rejectedEntries = await context.services.entries.listRejected();

    const entriesWithPhotos = await Promise.all(
      rejectedEntries.map(async (entry) => {
        const entryPhotos = await photos.forEntry(entry._id).list(context.db);
        return {
          ...entry,
          photos: entryPhotos,
        };
      }),
    );

    return entriesWithPhotos;
  });

export const get = userCompetitionAdminQuery
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.get({
      entryId: input.entryId,
    });
    const entryPhotos = await photos.forEntry(input.entryId).list(context.db);

    return {
      ...entry,
      photos: entryPhotos,
    };
  });

export const getUserDetails = userCompetitionAdminQuery
  .input({ userId: v.id("users") })
  .handler(async ({ context, input }) => {
    const user = await context.db.get(input.userId);
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
  });

export const getEntryValidationStatus = userCompetitionAdminQuery
  .input({ entryId: v.id("entries") })
  .returns(
    v.object({
      hasConflicts: v.boolean(),
      isWithinBoundary: v.union(v.boolean(), v.null()),
      isOnWhitelist: v.union(v.boolean(), v.null()),
    }),
  )
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.get({
      entryId: input.entryId,
    });
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
    const hasConflicts =
      await context.services.entries.hasEntryWithPlaceIdAlreadyBeenSubmitted(
        placeId,
        input.entryId,
      );

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
      isWithinBoundary = isLocationWithinCompetitionBoundary(
        houseAddress.lat,
        houseAddress.lng,
      );

    // Check if user email is on whitelist
    const user = await context.db.get<"users">(entry.submittedByUserId);
    const isOnWhitelist = user ? isUserEmailOnWhitelist(user.email) : null;

    return { hasConflicts, isWithinBoundary, isOnWhitelist };
  });

// Mutations

export const approve = userCompetitionAdminMutation
  .input({
    entryId: v.id("entries"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.get({
      entryId: input.entryId,
    });
    const entryNumber =
      await context.services.entryManagement.getNextAvailableEntryNumber();
    await context.services.entryApproval.approve({
      entryId: input.entryId,
      entryNumber,
    });

    const user = await context.db.get<"users">(entry.submittedByUserId);
    if (!user || !user.email) return null;

    await email.sendEntryApprovalEmail(context, {
      to: user.email,
      entry: await context.services.entries.get({
        entryId: input.entryId,
      }),
      entryNumber,
    });

    return null;
  });

export const reject = userCompetitionAdminMutation
  .input({
    entryId: v.id("entries"),
    rejectedReason: v.string(),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.get({
      entryId: input.entryId,
    });
    await context.services.entryRejection.reject({
      entryId: input.entryId,
      rejectedReason: input.rejectedReason,
    });

    const user = await context.db.get<"users">(entry.submittedByUserId);
    if (!user || !user.email) return null;

    await email.sendEntryRejectionEmail(context, {
      to: user.email,
      entry: await context.services.entries.get({
        entryId: input.entryId,
      }),
      rejectedReason: input.rejectedReason,
    });

    return null;
  });
