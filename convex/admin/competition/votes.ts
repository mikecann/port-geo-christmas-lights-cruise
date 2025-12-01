import {
  userCompetitionAdminQuery,
  userCompetitionAdminAction,
  userCompetitionAdminQueryMiddleware,
  userCompetitionAdminActionMiddleware,
} from "./lib";
import { voteCategoryValidator } from "../../features/votes/schema";
import { v } from "convex/values";
import { aggregateVotes } from "../../features/votes/lib";
import { isNotNullOrUndefined } from "../../../shared/filter";
import { convex } from "../../schema";
import { internal } from "../../../convex/_generated/api";
import { paginationOptsValidator } from "convex/server";

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
  .handler(async ({ context, input }) => {
    const total = await aggregateVotes.count(context, {
      namespace: input.category,
    });
    if (total === 0 || input.offset >= total) return [];

    const firstInPage = await aggregateVotes.at(context, input.offset, {
      namespace: input.category,
    });

    const page = await aggregateVotes.paginate(context, {
      bounds: {
        lower: {
          key: firstInPage.key,
          id: firstInPage.id,
          inclusive: true,
        },
      },
      namespace: input.category,
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
  });

export const countForCategory = userCompetitionAdminQuery
  .input({
    category: voteCategoryValidator,
  })
  .returns(v.number())
  .handler(async ({ context, input }) => {
    const count = await aggregateVotes.count(context, {
      namespace: input.category,
    });
    return count;
  });

export const getAllVotesForExportPage = convex
  .query()
  .internal()
  .input({
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
  .handler(async ({ context, input }) => {
    const result = await context.db
      .query("votes")
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
  });

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
  .handler(async ({ context }) => {
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
        },
      );

      allVotes.push(...result.page);
      isDone = result.isDone;
      cursor = result.continueCursor;
    }

    return allVotes;
  });
