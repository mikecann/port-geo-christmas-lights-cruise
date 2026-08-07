import { v } from "convex/values";
import { competitions } from "../features/competitions/model";
import { convex } from "../schema";

const publicCompetitionValidator = v.object({
  _id: v.id("competitions"),
  year: v.number(),
  entriesOpen: v.boolean(),
  votingOpen: v.boolean(),
});

export const current = convex
  .query()
  .input({})
  .returns(publicCompetitionValidator)
  .handler(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    return {
      _id: competition._id,
      year: competition.year,
      entriesOpen: competition.entriesOpen,
      votingOpen: competition.votingOpen,
    };
  })
  .public();

export const list = convex
  .query()
  .input({})
  .returns(v.array(publicCompetitionValidator))
  .handler(async (ctx) => {
    // One row is added per year, so returning the full list stays naturally small.
    const rows = await ctx.db.query("competitions").collect();
    return rows
      .map((competition) => ({
        _id: competition._id,
        year: competition.year,
        entriesOpen: competition.entriesOpen,
        votingOpen: competition.votingOpen,
      }))
      .sort((a, b) => b.year - a.year);
  })
  .public();
