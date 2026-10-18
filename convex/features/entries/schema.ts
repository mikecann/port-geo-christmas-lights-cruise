import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { defineTable } from "convex/server";

export const commonEntryFields = {
  competitionId: v.id("competitions"),
  submittedByUserId: v.id("users"),
  // The same person's most recent approved entry in an earlier competition.
  // Entries started before this field existed don't have it, so read it
  // through entries.query().forEntry().findPrevious().
  previousEntryId: v.optional(v.id("entries")),
};

// Before approval this is a returning entrant's reserved number, kept from
// their previous entry. New entrants only get one when they're approved.
const reservedEntryNumber = v.optional(v.number());

export const homeAddressValidator = v.object({
  address: v.string(),
  lat: v.number(),
  lng: v.number(),
  placeId: v.string(),
});

export type HomeAddress = typeof homeAddressValidator.type;

export const draftHomeAddressValidator = v.object({
  address: v.string(),
  placeId: v.string(),
});
export type DraftHomeAddress = typeof draftHomeAddressValidator.type;

export const entrySchema = v.union(
  v.object({
    ...commonEntryFields,
    status: v.literal("draft"),
    houseAddress: v.optional(draftHomeAddressValidator),
    name: v.optional(v.string()),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    ...commonEntryFields,
    status: v.literal("submitting"),
    houseAddress: draftHomeAddressValidator,
    name: v.string(),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    ...commonEntryFields,
    status: v.literal("submitted"),
    submittedAt: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    ...commonEntryFields,
    status: v.literal("approved"),
    submittedAt: v.number(),
    approvedAt: v.number(),
    entryNumber: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
  }),
  v.object({
    ...commonEntryFields,
    status: v.literal("rejected"),
    rejectedAt: v.number(),
    rejectedReason: v.string(),
    submittedAt: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
    // Kept as a record, but a rejected entry doesn't hold its number
    entryNumber: reservedEntryNumber,
  }),
);

export type EntryDoc = Doc<"entries">;
export type EntryStatusKinds = EntryDoc["status"];
export type EntryWithKind<T extends EntryStatusKinds> = EntryDoc & {
  status: T;
};
export type ApprovedEntryDoc = EntryWithKind<"approved">;

// What anonymous visitors see of an approved entry: nothing about who entered
export const publicEntryValidator = v.object({
  _id: v.id("entries"),
  competitionId: v.id("competitions"),
  name: v.string(),
  entryNumber: v.number(),
  houseAddress: v.object({
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
  }),
});

export type PublicEntry = typeof publicEntryValidator.type;

export const entryTable = defineTable(entrySchema)
  .index("by_competitionId_and_status", ["competitionId", "status"])
  .index("by_competitionId_and_submittedByUserId", [
    "competitionId",
    "submittedByUserId",
  ])
  .index("by_competitionId_and_entryNumber", ["competitionId", "entryNumber"])
  .index("by_competitionId_and_homeAddress_placeId", [
    "competitionId",
    "houseAddress.placeId",
  ]);
