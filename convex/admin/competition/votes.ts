import { userCompetitionAdminQuery } from "./lib";
import { voteCategoryValidator } from "../../features/votes/schema";
import { v } from "convex/values";
import { aggregateVotes } from "../../features/votes/lib";
import { isNotNullOrUndefined } from "../../../shared/filter";

// Queries

export const listPageForCategory = userCompetitionAdminQuery({
  args: {
    category: voteCategoryValidator,
    offset: v.number(),
    numItems: v.number(),
  },
  returns: v.array(
    v.object({
      entryNumber: v.number(),
      entryName: v.string(),
      voterEmail: v.optional(v.string()),
      voterName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { category, numItems, offset }) => {
    const total = await aggregateVotes.count(ctx, {
      namespace: category,
    });
    if (total === 0 || offset >= total) return [];

    const firstInPage = await aggregateVotes.at(ctx, offset, {
      namespace: category,
    });

    const page = await aggregateVotes.paginate(ctx, {
      bounds: {
        lower: {
          key: firstInPage.key,
          id: firstInPage.id,
          inclusive: true,
        },
      },
      namespace: category,
      pageSize: numItems,
    });

    const votesData = await Promise.all(
      page.page.map(async (doc) => {
        const vote = await ctx.db.get(doc.id);
        if (!vote) return null;
        const voter = await ctx.db.get(vote.votingUserId);
        if (!voter) return null;
        const entry = await ctx.db.get(vote.entryId);
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
  },
});

export const countForCategory = userCompetitionAdminQuery({
  args: {
    category: voteCategoryValidator,
  },
  returns: v.number(),
  handler: async (ctx, { category }) => {
    const count = await aggregateVotes.count(ctx, {
      namespace: category,
    });
    return count;
  },
});
