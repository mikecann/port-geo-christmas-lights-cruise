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
import {
  isOutsideRange,
  type EntryNumberRange,
} from "../../features/entries/numbers";
import { isWithinBoundary } from "../../../shared/geo";

const reviewableStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("rejected"),
);

export type AdminEntry = FunctionReturnType<
  typeof api.admin.competition.entries.list
>[number];

export type AdminEntryRow = FunctionReturnType<
  typeof api.admin.competition.entries.listAll
>[number];

export type AdminEntryDetail = NonNullable<
  FunctionReturnType<typeof api.admin.competition.entries.get>
>;

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

const describeSubmitter = async (context: QueryCtx, entry: Doc<"entries">) => {
  const submitter = await context.db.get(entry.submittedByUserId);
  return (
    submitter && {
      _id: submitter._id,
      name: submitter.name,
      email: submitter.email,
      image: submitter.image,
    }
  );
};

const isNumberOutsideRange = (entry: Doc<"entries">, range: EntryNumberRange) =>
  entry.status !== "rejected" &&
  entry.entryNumber !== undefined &&
  isOutsideRange(entry.entryNumber, range);

// What a reviewer should look at before approving
const describeChecks = async (
  context: QueryCtx,
  entry: Doc<"entries">,
  previous: { entryNumber: number } | null,
) => {
  const { houseAddress } = entry;
  // Same rule as submitting: drafts and rejected entries don't block an address
  const sameAddress = houseAddress
    ? (
        await entries
          .query(context)
          .findEntriesByPlaceId(entry.competitionId, houseAddress.placeId)
      ).filter(
        (other) =>
          other._id !== entry._id &&
          other.status !== "draft" &&
          other.status !== "rejected",
      )
    : [];
  const previousNumberHolder =
    previous &&
    entry.status !== "rejected" &&
    entry.entryNumber !== previous.entryNumber
      ? await entries
          .query(context)
          .findHolderOfNumber(
            entry.competitionId,
            previous.entryNumber,
            entry._id,
          )
      : null;
  return {
    // Drafts haven't been geocoded yet, so there's nothing to check
    isWithinBoundary:
      houseAddress && "lat" in houseAddress
        ? isWithinBoundary(houseAddress)
        : null,
    location:
      houseAddress && "lat" in houseAddress
        ? { lat: houseAddress.lat, lng: houseAddress.lng }
        : null,
    sameAddress: sameAddress.map((other) => ({
      _id: other._id,
      name: other.name ?? "",
    })),
    previousNumberHeldBy: previousNumberHolder && {
      _id: previousNumberHolder._id,
      name: previousNumberHolder.name ?? "",
    },
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

// The review queue cards, with everything a reviewer needs on one card so
// each doesn't have to fetch it again
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
        const previous = await describePreviousEntry(context, entry);
        return {
          ...entry,
          photos: await photos.forEntry(entry._id).list(context.db),
          submitter: await describeSubmitter(context, entry),
          previous,
          isNumberOutsideRange: isNumberOutsideRange(entry, range),
          checks: await describeChecks(context, entry, previous),
        };
      }),
    );
  })
  .public();

// One row per entry this year, whatever its status, for searching
export const listAll = competitionAdminQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const range = competitions.entryNumberRange(competition);
    const allEntries = await context.db
      .query("entries")
      .withIndex("by_competitionId_and_status", (q) =>
        q.eq("competitionId", competition._id),
      )
      .collect();
    return await Promise.all(
      allEntries.map(async (entry) => {
        const submitter = await describeSubmitter(context, entry);
        const previous = await describePreviousEntry(context, entry);
        return {
          _id: entry._id,
          status: entry.status,
          name: entry.name ?? "",
          address: entry.houseAddress?.address ?? "",
          entryNumber:
            entry.status === "rejected" ? undefined : entry.entryNumber,
          submitterName: submitter?.name,
          submitterEmail: submitter?.email,
          previous: previous && {
            year: previous.year,
            entryNumber: previous.entryNumber,
          },
          isNumberOutsideRange: isNumberOutsideRange(entry, range),
        };
      }),
    );
  })
  .public();

// Everything about one entry, including the person's entries in earlier years
export const get = competitionAdminQuery
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    const entry = await entries.query(context).forEntry(input.entryId).find();
    if (!entry) return null;
    const competition = await competitions
      .query(context)
      .forCompetition(entry.competitionId)
      .get();
    const current = await competitions.query(context).current();
    const previous = await describePreviousEntry(context, entry);
    const earlier = await entries
      .query(context)
      .forUser(entry.competitionId, entry.submittedByUserId)
      .listPrevious();
    return {
      entry,
      year: competition.year,
      isCurrent: competition._id === current._id,
      submitter: await describeSubmitter(context, entry),
      previous,
      isNumberOutsideRange: isNumberOutsideRange(
        entry,
        competitions.entryNumberRange(competition),
      ),
      checks: await describeChecks(context, entry, previous),
      earlierEntries: earlier.map((row) => ({
        _id: row.entry._id,
        year: row.competition.year,
        name: row.entry.name ?? "",
        status: row.entry.status,
        entryNumber:
          row.entry.status === "approved" ? row.entry.entryNumber : undefined,
      })),
    };
  })
  .public();

export const getStats = competitionAdminQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    return await entries.query(context).getStats(competition._id);
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
    const entry = await getCurrentEntry(context, input.entryId);
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
    const entry = await getCurrentEntry(context, input.entryId);
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

// For a rejection made by mistake. They get an email again when it's reviewed.
export const reopen = competitionAdminMutation
  .input({ entryId: v.id("entries") })
  .returns(v.null())
  .handler(async (context, input) => {
    await getCurrentEntry(context, input.entryId);
    await entries.mutate(context).forEntry(input.entryId).reopen();
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
