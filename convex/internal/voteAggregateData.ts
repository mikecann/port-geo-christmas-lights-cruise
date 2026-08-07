import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { convex, vv } from "../schema";
import { VOTE_CATEGORIES } from "../features/votes/schema";
import { aggregateVotes, voteNamespace } from "../features/votes/lib";

/**
 * Reads votes in bounded pages for the aggregate maintenance action.
 *
 * This stays internal because raw vote records include voter identifiers and
 * should never be exposed through the public API.
 */
export const listVotesPage = convex
  .query()
  .input({ paginationOpts: paginationOptsValidator })
  .returns(paginationResultValidator(vv.doc("votes")))
  .handler(async (ctx, input) => {
    return await ctx.db.query("votes").paginate(input.paginationOpts);
  })
  .internal();

export const verify = convex
  .query()
  .input({})
  .returns(
    v.object({
      sourceTotal: v.number(),
      aggregateTotal: v.number(),
      counts: v.array(
        v.object({
          year: v.number(),
          category: v.string(),
          source: v.number(),
          aggregate: v.number(),
        }),
      ),
    }),
  )
  .handler(async (ctx) => {
    const competitionRows = await ctx.db.query("competitions").take(20);
    const counts = [];

    for (const competition of competitionRows) {
      const sourceVotes = await ctx.db
        .query("votes")
        .withIndex("by_competitionId", (q) =>
          q.eq("competitionId", competition._id),
        )
        .collect();

      for (const category of VOTE_CATEGORIES)
        counts.push({
          year: competition.year,
          category,
          source: sourceVotes.filter((vote) => vote.category === category)
            .length,
          aggregate: await aggregateVotes.count(ctx, {
            namespace: voteNamespace(competition._id, category),
          }),
        });
    }

    return {
      sourceTotal: counts.reduce((total, count) => total + count.source, 0),
      aggregateTotal: counts.reduce(
        (total, count) => total + count.aggregate,
        0,
      ),
      counts,
    };
  })
  .internal();
