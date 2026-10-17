import { myMutation, myQuery } from "./lib";
import { votes } from "../features/votes/model";
import { photos } from "../features/photos/model";
import { v } from "convex/values";
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

function requireVotingToBeOpen(competition: Doc<"competitions">) {
  if (!competition.votingOpen)
    throw new Error(votingClosedMessage(competition.year));
}

export const list = myQuery
  .input({})
  .handler(async (context) => {
    return await votes.forUser(context.userId).list(context.db);
  })
  .public();

export const hasVoted = myQuery
  .input({
    category: voteCategoryValidator,
  })
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    return await votes
      .forUser(context.userId)
      .hasVotedForCategory(context.db, competition._id, input.category);
  })
  .public();

export const getForCategory = myQuery
  .input({
    category: voteCategoryValidator,
  })
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    const vote = await votes
      .forUser(context.userId)
      .findVoteForCategory(context.db, competition._id, input.category);

    if (!vote) return null;

    const entry = await context.db.get(vote.entryId);
    if (!entry || entry.status !== "approved") return null;

    const entryPhotos = await photos
      .forEntry(vote.entryId)
      .listPublic(context.db);

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
  })
  .public();

export const getStatus = myQuery
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

export const vote = myMutation
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
      throw new Error("Entry does not belong to the current competition");

    await votes.forUser(context.userId).voteForEntry(context.db, {
      competitionId: competition._id,
      entryId: input.entryId,
      category: input.category,
    });

    return null;
  })
  .public();

export const cancel = myMutation
  .input({
    voteId: v.id("votes"),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    await enforceUserRateLimit(context, "changeVote", context.userId);
    const vote = await context.db.get(input.voteId);
    if (!vote) throw new Error(`Vote '${input.voteId}' not found`);
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
