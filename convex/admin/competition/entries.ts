import {
  competitionAdminMutation,
  competitionAdminQuery,
} from "../../features/common/auth";
import { entries } from "../../features/entries/model";
import { photos } from "../../features/photos/model";
import { email } from "../../features/email/model";
import { ConvexError, v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { competitions } from "../../features/competitions/model";
import { isOutsideRange } from "../../features/entries/numbers";
import { isWithinBoundary } from "../../../shared/geo";

const reviewableStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("rejected"),
);

export type AdminEntry = FunctionReturnType<
  typeof api.admin.competition.entries.list
>[number];

const describePreviousEntry = async (
  context: QueryCtx,
  entry: Doc<"entries">,
) => {
  const previous = await entries.query(context).findPreviousOf(entry);
  if (!previous) return null;
  const competition = await competitions
    .query(context)
    .forCompetition(previous.competitionId)
    .get();
  return {
    _id: previous._id,
    year: competition.year,
    entryNumber: previous.entryNumber,
    name: previous.name,
  };
};

// Past competitions are kept as history
const getCurrentEntry = async (context: QueryCtx, entryId: Id<"entries">) => {
  const entry = await entries.query(context).forEntry(entryId).get();
  const competition = await competitions.query(context).current();
  if (entry.competitionId !== competition._id)
    throw new ConvexError(
      "Entries from past competitions are kept as history and can't be changed.",
    );
  return entry;
};

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
    const range = competitions.entryNumberRange(competition);

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
          previous: await describePreviousEntry(context, entry),
          isNumberOutsideRange:
            entry.status !== "rejected" &&
            entry.entryNumber !== undefined &&
            isOutsideRange(entry.entryNumber, range),
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

    const isReturningEntrant =
      (await entries.query(context).findPreviousOf(entry)) !== null;

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
            entry.status === "rejected" ? undefined : entry.entryNumber,
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
      .forEntry(input.entryId)
      .approve();

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

// Approved entries from earlier years, for linking someone who signed in with
// a different account this year
export const listLinkablePreviousEntries = competitionAdminQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const earlierCompetitions = await competitions
      .query(context)
      .listBeforeYear(competition.year);
    const rows = [];
    for (const earlier of earlierCompetitions)
      for (const entry of await entries
        .query(context)
        .listApproved(earlier._id)) {
        const submitter = await context.db.get(entry.submittedByUserId);
        rows.push({
          _id: entry._id,
          year: earlier.year,
          entryNumber: entry.entryNumber,
          name: entry.name,
          address: entry.houseAddress.address,
          submitterEmail: submitter?.email,
        });
      }
    return rows;
  })
  .public();

export const setEntryNumber = competitionAdminMutation
  .input({ entryId: v.id("entries"), entryNumber: v.number() })
  .returns(v.null())
  .handler(async (context, input) => {
    await getCurrentEntry(context, input.entryId);
    await entries
      .mutate(context)
      .forEntry(input.entryId)
      .overrideEntryNumber(input.entryNumber);
    return null;
  })
  .public();

export const linkPreviousEntry = competitionAdminMutation
  .input({ entryId: v.id("entries"), previousEntryId: v.id("entries") })
  .returns(v.null())
  .handler(async (context, input) => {
    await getCurrentEntry(context, input.entryId);
    await entries
      .mutate(context)
      .forEntry(input.entryId)
      .linkPreviousEntry(input.previousEntryId);
    return null;
  })
  .public();
