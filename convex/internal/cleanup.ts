import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Photos stuck uploading for more than 5 minutes are considered abandoned
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export const cleanupOrphanedPhotos = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allPhotos = await ctx.db.query("photos").collect();
    let totalPhotos = 0;
    let orphanedPhotos = 0;
    const deletedPhotos: Array<{
      photoId: (typeof allPhotos)[number]["_id"];
      entryId: (typeof allPhotos)[number]["entryId"];
      storageId: string;
    }> = [];

    for (const photo of allPhotos) {
      totalPhotos++;

      // Skip mock photos - they don't have storage
      if (photo.kind === "mock") continue;

      // Skip photos still uploading - they don't have storage yet
      if (photo.uploadState.status === "uploading") continue;

      // Check uploaded photos
      if (photo.uploadState.status === "uploaded") {
        const storageId = photo.uploadState.storageId;

        // Try to get the storage metadata
        const storageMetadata = await ctx.db.system.get(storageId);

        // If storage doesn't exist, delete the photo record
        if (!storageMetadata) {
          orphanedPhotos++;
          deletedPhotos.push({
            photoId: photo._id,
            entryId: photo.entryId,
            storageId,
          });

          await ctx.db.delete(photo._id);
        }
      }
    }

    return {
      totalPhotos,
      orphanedPhotos,
      deletedPhotos,
    };
  },
});

export const cleanupStuckUploads = internalMutation({
  args: {
    timeoutMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeoutMs = args.timeoutMs ?? UPLOAD_TIMEOUT_MS;
    const now = Date.now();
    const allPhotos = await ctx.db.query("photos").collect();

    let totalPhotos = 0;
    let stuckPhotos = 0;
    const deletedPhotos: Array<{
      photoId: (typeof allPhotos)[number]["_id"];
      entryId: (typeof allPhotos)[number]["entryId"];
      uploadStartedAt: number;
      ageMs: number;
    }> = [];

    for (const photo of allPhotos) {
      totalPhotos++;

      // Skip mock photos
      if (photo.kind === "mock") continue;

      // Check for stuck uploads
      if (photo.uploadState.status === "uploading") {
        const uploadStartedAt = photo.uploadState.uploadStartedAt;
        const ageMs = now - uploadStartedAt;

        // If upload has been going for longer than timeout, delete it
        if (ageMs > timeoutMs) {
          stuckPhotos++;
          deletedPhotos.push({
            photoId: photo._id,
            entryId: photo.entryId,
            uploadStartedAt,
            ageMs,
          });

          await ctx.db.delete(photo._id);
        }
      }
    }

    return {
      totalPhotos,
      stuckPhotos,
      deletedPhotos,
      timeoutMs,
    };
  },
});
