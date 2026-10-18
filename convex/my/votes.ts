import { userMutation, userQuery } from "../features/common/auth";
import {
  isSameInbox,
  OWN_ENTRY_VOTE_MESSAGE,
  SAME_INBOX_VOTE_MESSAGE,
  votes,
} from "../features/votes/model";
import { ConvexError, v } from "convex/values";
import { locationCheckValidator } from "../features/votes/schema";
import type { CurrentVoteDoc } from "../features/votes/schema";
import { entries } from "../features/entries/model";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { votingClosedMessage } from "../../shared/eventStatus";
import { competitions } from "../features/competitions/model";
import { enforceUserRateLimit } from "../features/rateLimits/lib";
import { VOTE_ALREADY_REMOVED_MESSAGE } from "../features/votes/model";
import { claimVoterLocation } from "../features/votes/location";
import { publicEntryValidator } from "../features/entries/schema";

function requireVotingToBeOpen(competition: Doc<"competitions">) {
  if (!competition.votingOpen)
    throw new ConvexError(votingClosedMessage(competition.year));
}

const myVoteValidator = v.object({
  _id: v.id("votes"),
  entry: publicEntryValidator,
  inPerson: v.boolean(),
  sawInPerson: v.boolean(),
  locationCheck: locationCheckValidator,
});

const toMyVote = async (ctx: QueryCtx, vote: CurrentVoteDoc | null) => {
  if (!vote) return null;
  // Deleting an entry deletes its votes, so this only misses mid-review
  const entry = await entries.query(ctx).forEntry(vote.entryId).findApproved();
  if (!entry) return null;
  return {
    _id: vote._id,
    entry: entries.toPublic(entry),
    inPerson: vote.inPerson,
    sawInPerson: vote.sawInPerson,
    locationCheck: vote.locationCheck,
  };
};

const findMyVote = async (ctx: QueryCtx, userId: Id<"users">) => {
  const competition = await competitions.query(ctx).current();
  return await toMyVote(
    ctx,
    await votes.forUser(userId).find(ctx.db, competition._id),
  );
};

// Their one vote this year, whichever entry it's for
export const mine = userQuery
  .input({})
  .returns(v.union(myVoteValidator, v.null()))
  .handler(async (context) => await findMyVote(context, context.userId))
  .public();

// What the vote page for one entry needs to know about the signed in person
export const getForEntry = userQuery
  .input({ entryId: v.id("entries") })
  .returns(
    v.object({
      isOwnEntry: v.boolean(),
      vote: v.union(myVoteValidator, v.null()),
    }),
  )
  .handler(async (context, input) => {
    const entry = await context.db.get(input.entryId);
    return {
      isOwnEntry: entry?.submittedByUserId === context.userId,
      vote: await findMyVote(context, context.userId),
    };
  })
  .public();

// Votes for this entry, replacing any vote they already had this year
export const vote = userMutation
  .input({
    entryId: v.id("entries"),
    // The "I've seen this display in person" tick
    sawInPerson: v.boolean(),
    // From the worker's /api/geo, fetched fresh for each vote as it only
    // works once
    geoToken: v.optional(v.string()),
  })
  .returns(
    v.object({ inPerson: v.boolean(), locationCheck: locationCheckValidator }),
  )
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
    const [voter, entrant] = await Promise.all([
      context.db.get(context.userId),
      context.db.get(entry.submittedByUserId),
    ]);
    if (
      entry.submittedByUserId === context.userId ||
      isSameInbox(voter, entrant)
    )
      throw new ConvexError(OWN_ENTRY_VOTE_MESSAGE);
    const voterVotes = votes.forUser(context.userId);
    if (await voterVotes.findFromSameInbox(context.db, competition._id))
      throw new ConvexError(SAME_INBOX_VOTE_MESSAGE);

    const { locationCheck, location } = await claimVoterLocation(
      context.db,
      competitions.inPersonArea(competition),
      input.geoToken,
      Date.now(),
    );
    const inPerson = locationCheck === "ok" && input.sawInPerson;

    await voterVotes.cast(context.db, {
      competitionId: competition._id,
      entryId: entry._id,
      inPerson,
      sawInPerson: input.sawInPerson,
      locationCheck,
      ...(location ? { location } : {}),
      castAt: Date.now(),
    });

    return { inPerson, locationCheck };
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
