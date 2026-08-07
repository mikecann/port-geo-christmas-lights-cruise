import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { aggregateVotes } from "../features/votes/lib";
import { convex } from "../schema";

/**
 * Rebuilds the derived vote-count index after its namespace format changes.
 * The source-of-truth vote rows are never modified.
 */
export const rebuild = convex
  .action()
  .input({})
  .returns(v.object({ inserted: v.number() }))
  .handler(async (ctx): Promise<{ inserted: number }> => {
    await aggregateVotes.clearAll(ctx);

    let cursor: string | null = null;
    let isDone = false;
    let inserted = 0;

    while (!isDone) {
      const result: {
        page: Array<Doc<"votes">>;
        isDone: boolean;
        continueCursor: string | null;
      } = await ctx.runQuery(
        internal.internal.voteAggregateData.listVotesPage,
        {
          paginationOpts: { cursor, numItems: 100 },
        },
      );

      for (const vote of result.page) {
        await aggregateVotes.insert(ctx, vote);
        inserted++;
      }

      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    return { inserted };
  })
  .internal();
