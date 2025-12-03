import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

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
