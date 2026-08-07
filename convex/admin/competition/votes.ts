import {
  userCompetitionAdminQuery,
  userCompetitionAdminAction,
  userCompetitionAdminQueryMiddleware,
  userCompetitionAdminActionMiddleware,
} from "./lib";
import { voteCategoryValidator } from "../../features/votes/schema";
import { v } from "convex/values";
import { aggregateVotes, voteNamespace } from "../../features/votes/lib";
import { isNotNullOrUndefined } from "../../../shared/filter";
import { convex } from "../../schema";
import { internal } from "../../../convex/_generated/api";
import { paginationOptsValidator } from "convex/server";
import { competitions } from "../../features/competitions/model";

// Queries

export const listPageForCategory = userCompetitionAdminQuery
  .input({
    category: voteCategoryValidator,
    offset: v.number(),
    numItems: v.number(),
  })
  .returns(
    v.array(
      v.object({
        entryNumber: v.number(),
        entryName: v.string(),
        voterEmail: v.optional(v.string()),
        voterName: v.optional(v.string()),
      }),
    ),
  )
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    const namespace = voteNamespace(competition._id, input.category);
    const total = await aggregateVotes.count(context, {
      namespace,
    });
    if (total === 0 || input.offset >= total) return [];

    const firstInPage = await aggregateVotes.at(context, input.offset, {
      namespace,
    });

    const page = await aggregateVotes.paginate(context, {
      bounds: {
        lower: {
          key: firstInPage.key,
          id: firstInPage.id,
          inclusive: true,
        },
      },
      namespace,
      pageSize: input.numItems,
    });

    const votesData = await Promise.all(
      page.page.map(async (doc) => {
        const vote = await context.db.get(doc.id);
        if (!vote) return null;
        const voter = await context.db.get(vote.votingUserId);
        if (!voter) return null;
        const entry = await context.db.get(vote.entryId);
        if (!entry) return null;
        if (entry.status !== "approved") return null;
        return {
          entryNumber: entry.entryNumber,
          entryName: entry.name,
          voterEmail: voter.email,
          voterName: voter.name,
        };
      }),
    );

    return votesData.filter(isNotNullOrUndefined);
  })
  .public();

export const countForCategory = userCompetitionAdminQuery
  .input({
    category: voteCategoryValidator,
  })
  .returns(v.number())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    const count = await aggregateVotes.count(context, {
      namespace: voteNamespace(competition._id, input.category),
    });
    return count;
  })
  .public();

export const getAllVotesForExportPage = convex
  .query()
  .input({
    competitionId: v.id("competitions"),
    paginationOpts: paginationOptsValidator,
  })
  .returns(
    v.object({
      page: v.array(
        v.object({
          voteCategory: voteCategoryValidator,
          dateTime: v.number(),
          entryNumber: v.number(),
          voterEmail: v.string(),
          voterName: v.string(),
        }),
      ),
      isDone: v.boolean(),
      continueCursor: v.union(v.string(), v.null()),
    }),
  )
  .handler(async (context, input) => {
    const result = await context.db
      .query("votes")
      .withIndex("by_competitionId", (q) =>
        q.eq("competitionId", input.competitionId),
      )
      .order("asc")
      .paginate(input.paginationOpts);

    const votesWithDetails = await Promise.all(
      result.page.map(async (vote) => {
        const voter = await context.db.get(vote.votingUserId);
        const entry = await context.db.get(vote.entryId);
        if (!entry || entry.status !== "approved") return null;

        return {
          voteCategory: vote.category,
          dateTime: vote._creationTime,
          entryNumber: entry.entryNumber,
          voterEmail: voter?.email || "",
          voterName: voter?.name || "",
        };
      }),
    );

    return {
      page: votesWithDetails.filter(isNotNullOrUndefined),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  })
  .internal();

export const getAllVotesForExport = userCompetitionAdminAction
  .input({})
  .use(userCompetitionAdminActionMiddleware)
  .returns(
    v.array(
      v.object({
        voteCategory: voteCategoryValidator,
        dateTime: v.number(),
        entryNumber: v.number(),
        voterEmail: v.string(),
        voterName: v.string(),
      }),
    ),
  )
  .handler(async (context) => {
    const competition = await context.runQuery(
      internal.internal.competitions.current,
      {},
    );
    const allVotes: Array<{
      voteCategory: "best_display" | "most_jolly";
      dateTime: number;
      entryNumber: number;
      voterEmail: string;
      voterName: string;
    }> = [];

    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
      const result: {
        page: Array<{
          voteCategory: "best_display" | "most_jolly";
          dateTime: number;
          entryNumber: number;
          voterEmail: string;
          voterName: string;
        }>;
        isDone: boolean;
        continueCursor: string | null;
      } = await context.runQuery(
        internal.admin.competition.votes.getAllVotesForExportPage,
        {
          paginationOpts: {
            numItems: 100,
            cursor,
          },
          competitionId: competition._id,
        },
      );

      allVotes.push(...result.page);
      isDone = result.isDone;
      cursor = result.continueCursor;
    }

    return allVotes;
  })
  .public();
