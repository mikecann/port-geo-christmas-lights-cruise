import { userMutation, userQuery } from "../features/common/auth";
import { votes } from "../features/votes/model";
import { ConvexError, v } from "convex/values";
import {
  VOTE_CATEGORIES,
  voteCategoryValidator,
} from "../features/votes/schema";
import type { VoteCategory } from "../features/votes/schema";
import { entries } from "../features/entries/model";
import type { Doc } from "../_generated/dataModel";
import { votingClosedMessage } from "../../shared/eventStatus";
import { competitions } from "../features/competitions/model";
import { enforceUserRateLimit } from "../features/rateLimits/lib";
import { VOTE_ALREADY_REMOVED_MESSAGE } from "../features/votes/model";

function requireVotingToBeOpen(competition: Doc<"competitions">) {
  if (!competition.votingOpen)
    throw new ConvexError(votingClosedMessage(competition.year));
}

export const list = userQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    return await votes
      .forUser(context.userId)
      .list(context.db, competition._id);
  })
  .public();

export const getStatus = userQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const votingStatus: Record<VoteCategory, Doc<"votes"> | null> = {
      best_display: null,
      most_jolly: null,
    };

    for (const category of VOTE_CATEGORIES) {
      const vote = await votes
        .forUser(context.userId)
        .findVoteForCategory(context.db, competition._id, category);

      votingStatus[category] = vote;
    }

    return votingStatus;
  })
  .public();

export const vote = userMutation
  .input({
    entryId: v.id("entries"),
    category: voteCategoryValidator,
  })
  .returns(v.null())
  .handler(async (context, input) => {
    await enforceUserRateLimit(context, "changeVote", context.userId);
    const competition = await competitions.query(context).current();
    requireVotingToBeOpen(competition);

    const entry = await entries
      .query(context)
      .forEntry(input.entryId)
      .getApproved();
    if (entry.competitionId !== competition._id)
      throw new ConvexError(
        "Sorry, that entry is from a past competition, so it can't be voted for.",
      );

    await votes.forUser(context.userId).voteForEntry(context.db, {
      competitionId: competition._id,
      entryId: input.entryId,
      category: input.category,
    });

    return null;
  })
  .public();

export const cancel = userMutation
  .input({
    voteId: v.id("votes"),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    await enforceUserRateLimit(context, "changeVote", context.userId);
    const vote = await context.db.get(input.voteId);
    if (!vote) throw new ConvexError(VOTE_ALREADY_REMOVED_MESSAGE);
    const competition = await competitions
      .query(context)
      .forCompetition(vote.competitionId)
      .get();
    requireVotingToBeOpen(competition);

    await votes
      .forVote(input.voteId)
      .cancel(context.db, { userId: context.userId });
    return null;
  })
  .public();
