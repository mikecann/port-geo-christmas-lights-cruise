import { defineTable } from "convex/server";
import { v } from "convex/values";

export const VOTE_CATEGORIES = ["best_display", "most_jolly"] as const;

export const voteCategoryValidator = v.union(
  ...VOTE_CATEGORIES.map((category) => v.literal(category)),
);

export type VoteCategory = (typeof VOTE_CATEGORIES)[number];

// What people read about each category, on the vote screen and My Votes
export const VOTE_CATEGORY_DETAILS: Record<
  VoteCategory,
  { title: string; description: string; whatToConsider: string }
> = {
  best_display: {
    title: "Best Display",
    description:
      "Best Display highlights creativity, visual impact and overall presentation of the lights.",
    whatToConsider:
      "Vote for the home that impresses you most with its creativity, scale, and technical execution.",
  },
  most_jolly: {
    title: "Most Jolly",
    description:
      "Most Jolly celebrates festive spirit, warmth and joy conveyed by the display.",
    whatToConsider:
      "Vote for the home that brings the most Christmas cheer and warm fuzzy feelings. Look for homes that have gone the extra mile, dressing up, dancing, singing and welcoming boats!",
  },
};

// Votes link a user to an entry they've voted for
export const voteTable = defineTable({
  competitionId: v.id("competitions"),
  entryId: v.id("entries"),
  votingUserId: v.id("users"),
  category: voteCategoryValidator,
})
  .index("by_competitionId", ["competitionId"])
  .index("by_entryId", ["entryId"])
  .index("by_votingUserId_and_competitionId_and_category", [
    "votingUserId",
    "competitionId",
    "category",
  ]);
