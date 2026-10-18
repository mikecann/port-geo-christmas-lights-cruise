import {
  competitionAdminMutation,
  competitionAdminQuery,
} from "../../features/common/auth";
import { competitions } from "../../features/competitions/model";
import { entries } from "../../features/entries/model";
import { aggregateVotes, voteNamespace } from "../../features/votes/lib";
import { v } from "convex/values";

// What the admin overview leads with
export const overview = competitionAdminQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const countVotes = (tally: "in_person" | "online") =>
      aggregateVotes.count(context, {
        namespace: voteNamespace(competition._id, tally),
      });
    const [inPerson, online] = await Promise.all([
      countVotes("in_person"),
      countVotes("online"),
    ]);
    return {
      year: competition.year,
      entriesOpen: competition.entriesOpen,
      votingOpen: competition.votingOpen,
      entries: await entries.query(context).getStats(competition._id),
      votes: { inPerson, total: inPerson + online },
    };
  })
  .public();

export const setEntriesOpen = competitionAdminMutation
  .input({ open: v.boolean() })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await competitions
      .mutate(context)
      .setEntriesOpen(competition._id, input.open);
    return null;
  })
  .public();

export const setVotingOpen = competitionAdminMutation
  .input({ open: v.boolean() })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await competitions
      .mutate(context)
      .setVotingOpen(competition._id, input.open);
    return null;
  })
  .public();

const entryNumberRangeValidator = v.object({
  min: v.number(),
  max: v.number(),
});

export const getEntryNumberRange = competitionAdminQuery
  .input({})
  .returns(entryNumberRangeValidator)
  .handler(async (context) =>
    competitions.entryNumberRange(await competitions.query(context).current()),
  )
  .public();

export const setEntryNumberRange = competitionAdminMutation
  .input({ min: v.number(), max: v.number() })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await competitions
      .mutate(context)
      .setEntryNumberRange(competition._id, input);
    return null;
  })
  .public();

const inPersonAreaValidator = v.object({
  countries: v.array(v.string()),
  waOnly: v.boolean(),
});

export const getInPersonArea = competitionAdminQuery
  .input({})
  .returns(inPersonAreaValidator)
  .handler(async (context) =>
    competitions.inPersonArea(await competitions.query(context).current()),
  )
  .public();

export const setInPersonArea = competitionAdminMutation
  .input(inPersonAreaValidator.fields)
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await competitions.mutate(context).setInPersonArea(competition._id, input);
    return null;
  })
  .public();
