import {
  competitionAdminMutation,
  competitionAdminQuery,
} from "../../features/common/auth";
import { entries } from "../../features/entries/model";
import { photos } from "../../features/photos/model";
import { email } from "../../features/email/model";
import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../_generated/api";
import { competitions } from "../../features/competitions/model";
import { isWithinBoundary } from "../../../shared/geo";

const reviewableStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("rejected"),
);

export type AdminEntry = FunctionReturnType<
  typeof api.admin.competition.entries.list
>[number];

// Queries

// What the admin entry cards and tables show, including the photos and the
// person who entered, so each card doesn't have to fetch them again
export const list = competitionAdminQuery
  .input({ status: reviewableStatusValidator })
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    const statusEntries = await entries
      .query(context)
      .listWithStatus(competition._id, input.status);

    return await Promise.all(
      statusEntries.map(async (entry) => {
        const submitter = await context.db.get(entry.submittedByUserId);
        return {
          ...entry,
          photos: await photos.forEntry(entry._id).list(context.db),
          submitter: submitter && {
            name: submitter.name,
            email: submitter.email,
          },
        };
      }),
    );
  })
  .public();

export const getStats = competitionAdminQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    return await entries.query(context).getStats(competition._id);
  })
  .public();

export const getUserDetails = competitionAdminQuery
  .input({ userId: v.id("users") })
  .handler(async (context, input) => {
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
  })
  .public();

export const getEntryValidationStatus = competitionAdminQuery
  .input({ entryId: v.id("entries") })
  .returns(
    v.object({
      hasConflicts: v.boolean(),
      isWithinBoundary: v.union(v.boolean(), v.null()),
      isReturningEntrant: v.boolean(),
    }),
  )
  .handler(async (context, input) => {
    const entry = await entries.query(context).forEntry(input.entryId).get();
    if (!entry.houseAddress)
      return {
        hasConflicts: false,
        isWithinBoundary: null,
        isReturningEntrant: false,
      };

    const hasConflicts = await entries
      .query(context)
      .hasEntryWithPlaceIdAlreadyBeenSubmitted(
        entry.competitionId,
        entry.houseAddress.placeId,
        input.entryId,
      );

    const isReturningEntrant = await entries
      .query(context)
      .forUser(entry.competitionId, entry.submittedByUserId)
      .hasApprovedEntryBefore();

    return {
      hasConflicts,
      // Drafts haven't been geocoded yet, so there's nothing to check
      isWithinBoundary:
        "lat" in entry.houseAddress
          ? isWithinBoundary(entry.houseAddress)
          : null,
      isReturningEntrant,
    };
  })
  .public();

export const getAllEntriesForExport = competitionAdminQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const allEntries = await context.db
      .query("entries")
      .withIndex("by_competitionId_and_status", (q) =>
        q.eq("competitionId", competition._id),
      )
      .collect();

    const entriesWithUsers = await Promise.all(
      allEntries.map(async (entry) => {
        const user = await context.db.get(entry.submittedByUserId);
        return {
          userEmail: user?.email || "",
          userName: user?.name || "",
          entryNumber:
            entry.status === "approved" ? entry.entryNumber : undefined,
          entryName: entry.name || "",
          entryAddress: entry.houseAddress?.address ?? "",
        };
      }),
    );

    return entriesWithUsers;
  })
  .public();

// Mutations

export const approve = competitionAdminMutation
  .input({
    entryId: v.id("entries"),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const entry = await entries.query(context).forEntry(input.entryId).get();
    const entryNumber = await entries
      .mutate(context)
      .getNextAvailableEntryNumber(
        entry.competitionId,
        entry.submittedByUserId,
      );
    await entries
      .mutate(context)
      .forEntry(input.entryId)
      .approve({ entryNumber });

    const user = await context.db.get(entry.submittedByUserId);
    if (!user?.email) return null;

    await email.sendEntryApprovalEmail(context, {
      to: user.email,
      entry: await entries.query(context).forEntry(input.entryId).get(),
      entryNumber,
    });

    return null;
  })
  .public();

export const reject = competitionAdminMutation
  .input({
    entryId: v.id("entries"),
    rejectedReason: v.string(),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const entry = await entries.query(context).forEntry(input.entryId).get();
    await entries
      .mutate(context)
      .forEntry(input.entryId)
      .reject({ rejectedReason: input.rejectedReason });

    const user = await context.db.get(entry.submittedByUserId);
    if (!user?.email) return null;

    await email.sendEntryRejectionEmail(context, {
      to: user.email,
      entry: await entries.query(context).forEntry(input.entryId).get(),
      rejectedReason: input.rejectedReason,
    });

    return null;
  })
  .public();
