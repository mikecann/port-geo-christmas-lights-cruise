import { defineTable } from "convex/server";
import { v } from "convex/values";

export const competitionTable = defineTable({
  year: v.number(),
  entriesOpen: v.boolean(),
  votingOpen: v.boolean(),
  // Where new entrants' numbers are drawn from, inclusive. Unset means
  // DEFAULT_ENTRY_NUMBER_RANGE.
  entryNumberMin: v.optional(v.number()),
  entryNumberMax: v.optional(v.number()),
  // Where a voter's IP has to be for their vote to count as in person.
  // Unset means DEFAULT_IN_PERSON_AREA.
  inPersonCountries: v.optional(v.array(v.string())),
  inPersonWaOnly: v.optional(v.boolean()),
}).index("by_year", ["year"]);
