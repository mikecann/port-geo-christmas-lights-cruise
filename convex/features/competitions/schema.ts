import { defineTable } from "convex/server";
import { v } from "convex/values";

export const competitionTable = defineTable({
  year: v.number(),
  entriesOpen: v.boolean(),
  votingOpen: v.boolean(),
}).index("by_year", ["year"]);
