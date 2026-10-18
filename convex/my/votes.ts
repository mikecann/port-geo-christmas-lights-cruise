import { userMutation, userQuery } from "../features/common/auth";
import {
  isOwnEntry,
  OWN_ENTRY_VOTE_MESSAGE,
  SAME_INBOX_VOTE_MESSAGE,
  votes,
} from "../features/votes/model";
import { ConvexError, v } from "convex/values";
import {
  locationCheckValidator,
  voteCategoryOf,
  voteCategoryValidator,
} from "../features/votes/schema";
import type { CurrentVoteDoc, VoteCategory } from "../features/votes/schema";
import { entries } from "../features/entries/model";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { votingClosedMessage } from "../../shared/eventStatus";
import {
  MOST_JOLLY_IN_PERSON_MESSAGE,
  SEEN_IN_PERSON_REQUIRED_MESSAGE,
} from "../../shared/voting";
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
  category: voteCategoryValidator,
  entry: publicEntryValidator,
  inPerson: v.boolean(),
  sawInPerson: v.boolean(),
  locationCheck: locationCheckValidator,
});

// Their vote in each category, or null where they haven't voted
const myVotesValidator = v.object({
  best_display: v.union(myVoteValidator, v.null()),
  most_jolly: v.union(myVoteValidator, v.null()),
});

const toMyVote = async (ctx: QueryCtx, vote: CurrentVoteDoc | undefined) => {
  if (!vote) return null;
  // Deleting an entry deletes its votes, so this only misses mid-review
  const entry = await entries.query(ctx).forEntry(vote.entryId).findApproved();
  if (!entry) return null;
  return {
    _id: vote._id,
    category: voteCategoryOf(vote),
    entry: entries.toPublic(entry),
    inPerson: vote.inPerson,
    sawInPerson: vote.sawInPerson,
    locationCheck: vote.locationCheck,
  };
};

const findMyVotes = async (ctx: QueryCtx, userId: Id<"users">) => {
  const competition = await competitions.query(ctx).current();
  const current = await votes
    .forUser(userId)
    .listCurrent(ctx.db, competition._id);
  const voteIn = (category: VoteCategory) =>
    toMyVote(
      ctx,
      current.find((vote) => voteCategoryOf(vote) === category),
    );
  const [best_display, most_jolly] = await Promise.all([
    voteIn("best_display"),
    voteIn("most_jolly"),
  ]);
  return { best_display, most_jolly };
};

// Their votes this year, whichever entries they're for
export const mine = userQuery
  .input({})
  .returns(myVotesValidator)
  .handler(async (context) => await findMyVotes(context, context.userId))
  .public();

// What the vote page for one entry needs to know about the signed in person
export const getForEntry = userQuery
  .input({ entryId: v.id("entries") })
  .returns(
    v.object({
      isOwnEntry: v.boolean(),
      votes: myVotesValidator,
    }),
  )
  .handler(async (context, input) => {
    const entry = await context.db.get(input.entryId);
    return {
      isOwnEntry: entry
        ? await isOwnEntry(context.db, context.userId, entry)
        : false,
      votes: await findMyVotes(context, context.userId),
    };
  })
  .public();

// Votes for this entry in one category, replacing any vote they already had
// in it this year
export const vote = userMutation
  .input({
    entryId: v.id("entries"),
    category: voteCategoryValidator,
    // Their answer to "have you seen this display in person?". The vote page
    // only asks when the location check passes, and then it's required.
    sawInPerson: v.optional(v.boolean()),
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
    if (await isOwnEntry(context.db, context.userId, entry))
      throw new ConvexError(OWN_ENTRY_VOTE_MESSAGE);
    const voterVotes = votes.forUser(context.userId);
    if (
      await voterVotes.findFromSameInbox(
        context.db,
        competition._id,
        input.category,
      )
    )
      throw new ConvexError(SAME_INBOX_VOTE_MESSAGE);

    const { locationCheck, location } = await claimVoterLocation(
      context.db,
      competitions.inPersonArea(competition),
      input.geoToken,
      Date.now(),
    );
    if (locationCheck === "ok" && input.sawInPerson === undefined)
      throw new ConvexError(SEEN_IN_PERSON_REQUIRED_MESSAGE);
    const sawInPerson = input.sawInPerson ?? false;
    const inPerson = locationCheck === "ok" && sawInPerson;
    // Throwing undoes claiming the token too, so they can try again with it
    if (input.category === "most_jolly" && !inPerson)
      throw new ConvexError(MOST_JOLLY_IN_PERSON_MESSAGE);

    await voterVotes.cast(context.db, {
      competitionId: competition._id,
      entryId: entry._id,
      category: input.category,
      inPerson,
      sawInPerson,
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
