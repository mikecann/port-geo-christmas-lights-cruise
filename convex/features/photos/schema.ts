import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { defineTable } from "convex/server";

const commonPhotoFields = {
  entryId: v.id("entries"),
};

export type PhotoDoc = Doc<"photos">;

// What anonymous visitors see: no storage ids and no upload URLs
export const publicPhotoValidator = v.union(
  v.object({
    _id: v.id("photos"),
    entryId: v.id("entries"),
    kind: v.literal("mock"),
    mockPath: v.string(),
  }),
  v.object({
    _id: v.id("photos"),
    entryId: v.id("entries"),
    kind: v.literal("convex_stored"),
    url: v.string(),
  }),
);

export type PublicPhoto = typeof publicPhotoValidator.type;

export const photoTable = defineTable(
  v.union(
    v.object({
      ...commonPhotoFields,
      kind: v.literal("mock"),
      mockPath: v.string(), // Relative path from public/mockPhotos
    }),
    v.object({
      ...commonPhotoFields,
      kind: v.literal("convex_stored"),
      uploadState: v.union(
        v.object({
          status: v.literal("uploading"),
          uploadStartedAt: v.number(),
          uploadUrl: v.string(),
        }),
        v.object({
          status: v.literal("uploaded"),
          storageId: v.id("_storage"),
          url: v.string(),
        }),
      ),
    }),
  ),
)
  .index("by_entryId", ["entryId"])
  .index("by_uploadState_storageId", ["uploadState.storageId"]);
