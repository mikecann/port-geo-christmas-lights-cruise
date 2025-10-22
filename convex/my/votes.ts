import { myMutation } from "./lib";
import { myQuery } from "./lib";
import { votes } from "../features/votes/model";
import { photos } from "../features/photos/model";
import { v } from "convex/values";
import {
  VOTE_CATEGORIES,
  VoteCategory,
  voteCategoryValidator,
} from "../features/votes/schema";
import { entries } from "../features/entries/model";
import { vv } from "../schema";
import { homeAddressValidator } from "../features/entries/schema";
import { Doc } from "../_generated/dataModel";

export const list = myQuery({
  args: {},
  handler: async (ctx) => {
    return await votes.forUser(ctx.userId).list(ctx.db);
  },
});

export const hasVoted = myQuery({
  args: {
    category: voteCategoryValidator,
  },
  handler: async (ctx, args) => {
    return await votes
      .forUser(ctx.userId)
      .hasVotedForCategory(ctx.db, args.category);
  },
});

export const getForCategory = myQuery({
  args: {
    category: voteCategoryValidator,
  },
  handler: async (ctx, args) => {
    const vote = await votes
      .forUser(ctx.userId)
      .findVoteForCategory(ctx.db, args.category);

    if (!vote) return null;

    const entry = await ctx.db.get(vote.entryId);
    if (!entry || entry.status !== "approved") return null;

    const entryPhotos = await photos.forEntry(vote.entryId).list(ctx.db);

    return {
      vote,
      entry: {
        _id: entry._id,
        name: entry.name,
        entryNumber: entry.entryNumber,
        houseAddress: entry.houseAddress,
        photos: entryPhotos,
      },
    };
  },
});

export const getStatus = myQuery({
  args: {},
  handler: async (ctx) => {
    const votingStatus: Record<VoteCategory, Doc<"votes"> | null> = {
      best_display: null,
      most_jolly: null,
    };

    for (const category of VOTE_CATEGORIES) {
      const vote = await votes
        .forUser(ctx.userId)
        .findVoteForCategory(ctx.db, category);

      votingStatus[category] = vote;
    }

    return votingStatus;
  },
});

export const vote = myMutation({
  args: {
    entryId: v.id("entries"),
    category: voteCategoryValidator,
  },
  handler: async (ctx, args) => {
    // Validate entry exists
    await entries.forEntry(args.entryId).get(ctx.db);

    await votes.forUser(ctx.userId).voteForEntry(ctx.db, {
      entryId: args.entryId,
      category: args.category,
    });

    return null;
  },
});

export const cancel = myMutation({
  args: {
    voteId: v.id("votes"),
  },
  handler: async (ctx, args) => {
    await votes.forVote(args.voteId).cancel(ctx.db, { userId: ctx.userId });
    return null;
  },
});
