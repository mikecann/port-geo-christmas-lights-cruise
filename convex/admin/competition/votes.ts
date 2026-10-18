import {
  competitionAdminQuery,
  competitionAdminAction,
} from "../../features/common/auth";
import {
  locationCheckValidator,
  voteCategoryValidator,
  voterLocationValidator,
  isLegacyVote,
} from "../../features/votes/schema";
import { v } from "convex/values";
import { convex } from "../../schema";
import { internal } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { competitions } from "../../features/competitions/model";
import { competitionResults } from "../../features/votes/results";

const resolveCompetition = async (
  ctx: QueryCtx,
  competitionId: Id<"competitions"> | undefined,
) =>
  competitionId === undefined
    ? await competitions.query(ctx).current()
    : await competitions.query(ctx).forCompetition(competitionId).get();

const rankedEntryValidator = v.object({
  rank: v.number(),
  entryId: v.id("entries"),
  entryNumber: v.number(),
  entryName: v.string(),
  votes: v.number(),
});

// One row per vote. 2025's votes have a category and none of the 2026 fields.
const adminVoteValidator = v.object({
  _id: v.id("votes"),
  castAt: v.number(),
  entryNumber: v.optional(v.number()),
  entryName: v.optional(v.string()),
  voterEmail: v.optional(v.string()),
  voterName: v.optional(v.string()),
  category: v.optional(voteCategoryValidator),
  inPerson: v.optional(v.boolean()),
  sawInPerson: v.optional(v.boolean()),
  locationCheck: v.optional(locationCheckValidator),
  location: v.optional(voterLocationValidator),
});

const toAdminVote = async (ctx: QueryCtx, vote: Doc<"votes">) => {
  const voter = await ctx.db.get(vote.votingUserId);
  const entry = await ctx.db.get(vote.entryId);
  const common = {
    _id: vote._id,
    entryNumber: entry?.entryNumber,
    entryName: entry?.name,
    voterEmail: voter?.email,
    voterName: voter?.name,
  };
  if (isLegacyVote(vote))
    return { ...common, castAt: vote._creationTime, category: vote.category };
  return {
    ...common,
    castAt: vote.castAt,
    inPerson: vote.inPerson,
    sawInPerson: vote.sawInPerson,
    locationCheck: vote.locationCheck,
    location: vote.location,
  };
};

// Queries

export const results = competitionAdminQuery
  .input({ competitionId: v.optional(v.id("competitions")) })
  .returns(
    v.object({
      competitionId: v.id("competitions"),
      year: v.number(),
      inPersonFavourites: v.array(rankedEntryValidator),
      peoplesChoice: v.array(rankedEntryValidator),
      legacyCategories: v.object({
        best_display: v.array(rankedEntryValidator),
        most_jolly: v.array(rankedEntryValidator),
      }),
    }),
  )
  .handler(async (context, input) => {
    const competition = await resolveCompetition(context, input.competitionId);
    return {
      competitionId: competition._id,
      year: competition.year,
      ...(await competitionResults(context, competition._id)),
    };
  })
  .public();

// Flagged votes are 2026-style votes whose location check didn't pass, like
// ones from outside the in-person area
const listPageFor = (
  ctx: QueryCtx,
  competitionId: Id<"competitions">,
  flaggedOnly: boolean,
) => {
  const query = ctx.db
    .query("votes")
    .withIndex("by_competitionId", (q) => q.eq("competitionId", competitionId))
    .order("desc");
  if (!flaggedOnly) return query;
  return query.filter((q) =>
    q.and(
      q.neq(q.field("locationCheck"), undefined),
      q.neq(q.field("locationCheck"), "ok"),
    ),
  );
};

export const listPage = competitionAdminQuery
  .input({
    competitionId: v.optional(v.id("competitions")),
    flaggedOnly: v.boolean(),
    paginationOpts: paginationOptsValidator,
  })
  .returns(paginationResultValidator(adminVoteValidator))
  .handler(async (context, input) => {
    const competition = await resolveCompetition(context, input.competitionId);
    const result = await listPageFor(
      context,
      competition._id,
      input.flaggedOnly,
    ).paginate(input.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((vote) => toAdminVote(context, vote)),
      ),
    };
  })
  .public();

export const getAllVotesForExportPage = convex
  .query()
  .input({
    competitionId: v.id("competitions"),
    paginationOpts: paginationOptsValidator,
  })
  .returns(paginationResultValidator(adminVoteValidator))
  .handler(async (context, input) => {
    const result = await listPageFor(
      context,
      input.competitionId,
      false,
    ).paginate(input.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((vote) => toAdminVote(context, vote)),
      ),
    };
  })
  .internal();

export const getAllVotesForExport = competitionAdminAction
  .input({ competitionId: v.optional(v.id("competitions")) })
  .returns(v.array(adminVoteValidator))
  .handler(async (context, input) => {
    const competitionId =
      input.competitionId ??
      (await context.runQuery(internal.internal.competitions.current, {}))._id;
    const allVotes: Array<typeof adminVoteValidator.type> = [];

    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
      const result: {
        page: Array<typeof adminVoteValidator.type>;
        isDone: boolean;
        continueCursor: string;
      } = await context.runQuery(
        internal.admin.competition.votes.getAllVotesForExportPage,
        {
          paginationOpts: {
            numItems: 100,
            cursor,
          },
          competitionId,
        },
      );

      allVotes.push(...result.page);
      isDone = result.isDone;
      cursor = result.continueCursor;
    }

    return allVotes;
  })
  .public();
