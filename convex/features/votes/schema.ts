import { defineTable } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";

// 2025's votes were one per category. From 2026 each person has one vote, and
// these are only kept so the old votes stay valid and viewable.
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

// Why a vote did or didn't pass the IP location check. Only "ok" lets the
// voter's honesty tick make it count as in person.
export const LOCATION_CHECKS = [
  "ok",
  "outside_area",
  "no_location",
  "invalid",
  "expired",
  "not_configured",
  // A genuine token that had already been used for a vote
  "reused",
] as const;

export type LocationCheck = (typeof LOCATION_CHECKS)[number];

export const locationCheckValidator = v.union(
  ...LOCATION_CHECKS.map((check) => v.literal(check)),
);

// Where the worker's signed token said the voter was, for admins to review
export const voterLocationValidator = v.object({
  country: v.optional(v.string()),
  region: v.optional(v.string()),
  regionCode: v.optional(v.string()),
  city: v.optional(v.string()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  timezone: v.optional(v.string()),
  issuedAt: v.number(),
});

export type VoterLocation = typeof voterLocationValidator.type;

// Each location token's nonce, once a vote has used it. Rows can go once the
// token would have expired anyway.
export const usedGeoTokenTable = defineTable({
  nonce: v.string(),
  issuedAt: v.number(),
})
  .index("by_nonce", ["nonce"])
  .index("by_issuedAt", ["issuedAt"]);

const commonVoteFields = {
  competitionId: v.id("competitions"),
  entryId: v.id("entries"),
  votingUserId: v.id("users"),
};

export const legacyVoteSchema = v.object({
  ...commonVoteFields,
  category: voteCategoryValidator,
});

export const voteSchema = v.object({
  ...commonVoteFields,
  // Counts for In-Person Favourites as well as People's Choice
  inPerson: v.boolean(),
  // The "I've seen this display in person" tick
  sawInPerson: v.boolean(),
  locationCheck: locationCheckValidator,
  // Only set when the token was genuine
  location: v.optional(voterLocationValidator),
  // When they last voted or changed their vote
  castAt: v.number(),
  // The voter's canonicalEmail (see shared/auth.ts), so no other account for
  // the same inbox can vote too. Missing on votes from before the backfill.
  voterCanonicalEmail: v.optional(v.string()),
});

// Votes link a user to an entry they've voted for
export const voteTable = defineTable(v.union(legacyVoteSchema, voteSchema))
  .index("by_competitionId", ["competitionId"])
  .index("by_entryId", ["entryId"])
  .index("by_votingUserId_and_competitionId_and_category", [
    "votingUserId",
    "competitionId",
    "category",
  ])
  .index("by_competitionId_and_voterCanonicalEmail", [
    "competitionId",
    "voterCanonicalEmail",
  ]);

export type LegacyVoteDoc = Doc<"votes"> & { category: VoteCategory };
export type CurrentVoteDoc = Exclude<Doc<"votes">, { category: VoteCategory }>;

export const isLegacyVote = (vote: Doc<"votes">): vote is LegacyVoteDoc =>
  "category" in vote;
