import { myMutation, myQuery } from "./lib";
import { votes } from "../features/votes/model";
import { photos } from "../features/photos/model";
import { v } from "convex/values";
import {
  VOTE_CATEGORIES,
  voteCategoryValidator,
} from "../features/votes/schema";
import type { VoteCategory } from "../features/votes/schema";
import type { Doc } from "../_generated/dataModel";

export const list = myQuery.input({}).handler(async ({ context }) => {
  return await votes.forUser(context.userId).list(context.db);
});

export const hasVoted = myQuery
  .input({
    category: voteCategoryValidator,
  })
  .handler(async ({ context, input }) => {
    return await votes
      .forUser(context.userId)
      .hasVotedForCategory(context.db, input.category);
  });

export const getForCategory = myQuery
  .input({
    category: voteCategoryValidator,
  })
  .handler(async ({ context, input }) => {
    const vote = await votes
      .forUser(context.userId)
      .findVoteForCategory(context.db, input.category);

    if (!vote) return null;

    const entry = await context.db.get(vote.entryId);
    if (!entry || entry.status !== "approved") return null;

    const entryPhotos = await photos.forEntry(vote.entryId).list(context.db);

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
  });

export const getStatus = myQuery.input({}).handler(async ({ context }) => {
  const votingStatus: Record<VoteCategory, Doc<"votes"> | null> = {
    best_display: null,
    most_jolly: null,
  };

  for (const category of VOTE_CATEGORIES) {
    const vote = await votes
      .forUser(context.userId)
      .findVoteForCategory(context.db, category);

    votingStatus[category] = vote;
  }

  return votingStatus;
});

export const vote = myMutation
  .input({
    entryId: v.id("entries"),
    category: voteCategoryValidator,
  })
  .handler(async ({ context, input }) => {
    // Validate entry exists
    await context.services.entries.get({ entryId: input.entryId });

    await votes.forUser(context.userId).voteForEntry(context.db, {
      entryId: input.entryId,
      category: input.category,
    });

    return null;
  });

export const cancel = myMutation
  .input({
    voteId: v.id("votes"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await votes
      .forVote(input.voteId)
      .cancel(context.db, { userId: context.userId });
    return null;
  });
