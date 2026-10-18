import { defineTable } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";

// Each person gets one vote per category per competition. Best display counts
// for In-Person Favourites or People's Choice, and Most Jolly is in person only.
export const VOTE_CATEGORIES = ["best_display", "most_jolly"] as const;

export const voteCategoryValidator = v.union(
  ...VOTE_CATEGORIES.map((category) => v.literal(category)),
);

export type VoteCategory = (typeof VOTE_CATEGORIES)[number];

// Each category's name, and the few words under its button on the vote page
export const VOTE_CATEGORY_DETAILS: Record<
  VoteCategory,
  { title: string; hint: string }
> = {
  best_display: { title: "Best display", hint: "The lights" },
  most_jolly: { title: "Most jolly", hint: "Dancing & dress-ups" },
};

// Why a vote did or didn't pass the IP location check. Only "ok" lets the
// voter's "I've seen it" answer make it count as in person.
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
  // Missing on 2026 votes cast before Most Jolly became a public vote, which
  // were all for best display. Read it with voteCategoryOf.
  category: v.optional(voteCategoryValidator),
  // Seen in person and the location check passed. A best display vote counts
  // for In-Person Favourites when true and People's Choice when false. Most
  // Jolly votes are always in person.
  inPerson: v.boolean(),
  // Their answer to "have you seen this display in person?". false when they
  // weren't asked because the location check failed.
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

export type CurrentVoteDoc = Extract<Doc<"votes">, { inPerson: boolean }>;
export type LegacyVoteDoc = Exclude<Doc<"votes">, { inPerson: boolean }>;

export const isLegacyVote = (vote: Doc<"votes">): vote is LegacyVoteDoc =>
  !("inPerson" in vote);

export const voteCategoryOf = (vote: Doc<"votes">): VoteCategory =>
  vote.category ?? "best_display";
