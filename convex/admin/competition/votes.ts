import { userCompetitionAdminQuery } from "./lib";
import { voteCategoryValidator } from "../../features/votes/schema";
import { v } from "convex/values";
import { aggregateVotes } from "../../features/votes/lib";
import { isNotNullOrUndefined } from "../../../shared/filter";

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
