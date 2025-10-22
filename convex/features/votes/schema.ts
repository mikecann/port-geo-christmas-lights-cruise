import { defineTable } from "convex/server";
import { v } from "convex/values";

export const VOTE_CATEGORIES = ["best_display", "most_jolly"] as const;

export const voteCategoryValidator = v.union(
  ...VOTE_CATEGORIES.map((category) => v.literal(category)),
);

export type VoteCategory = (typeof VOTE_CATEGORIES)[number];

// Votes link a user to an entry they've voted for
export const voteTable = defineTable({
  entryId: v.id("entries"),
  votingUserId: v.id("users"),
  category: voteCategoryValidator,
}).index("by_votingUserId_and_category", ["votingUserId", "category"]);
