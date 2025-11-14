import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { defineTable } from "convex/server";

export const commonEntryFields = {
  submittedByUserId: v.id("users"),
};

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
  }),
  v.object({
    ...commonEntryFields,
    status: v.literal("submitting"),
    houseAddress: draftHomeAddressValidator,
    name: v.string(),
  }),
  v.object({
    ...commonEntryFields,
    status: v.literal("submitted"),
    submittedAt: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
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
  }),
);

export type EntryDoc = Doc<"entries">;
export type EntryStatusKinds = EntryDoc["status"];
export type EntryWithStatus<T extends EntryStatusKinds> = EntryDoc & {
  status: T;
};
export type ApprovedEntryDoc = EntryWithStatus<"approved">;

export const entryTable = defineTable(entrySchema)
  .index("by_status", ["status"])
  .index("by_submittedByUserId", ["submittedByUserId"])
  .index("by_entryNumber", ["entryNumber"])
  .index("by_homeAddress_placeId", ["houseAddress.placeId"]);
