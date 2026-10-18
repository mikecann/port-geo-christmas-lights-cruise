import { v } from "convex/values";
import { mutation } from "../features/common/lib";
import { usedGeoTokenCutoff } from "../features/votes/location";

// Photos stuck uploading for more than 5 minutes are considered abandoned
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export const cleanupOrphanedPhotos = mutation
  .input({})
  .handler(async (ctx) => {
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
  })
  .internal();

export const cleanupStuckUploads = mutation
  .input({
    timeoutMs: v.optional(v.number()),
  })
  .handler(async (ctx, args) => {
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
  })
  .internal();

// Convex Auth finds a sign-in code by its value and leaves expired ones
// behind. Codes are only 6 digits, so clearing them stops a new code clashing
// with an old one.
export const cleanupExpiredSignInCodes = mutation
  .input({})
  .handler(async (ctx) => {
    const now = Date.now();
    let deleted = 0;
    for (const code of await ctx.db.query("authVerificationCodes").take(1000))
      if (code.expirationTime < now) {
        await ctx.db.delete(code._id);
        deleted++;
      }
    return { deleted };
  })
  .internal();

// A used location token's nonce only matters until the token expires
export const cleanupUsedGeoTokens = mutation
  .input({})
  .handler(async (ctx) => {
    const old = await ctx.db
      .query("usedGeoTokens")
      .withIndex("by_issuedAt", (q) =>
        q.lt("issuedAt", usedGeoTokenCutoff(Date.now())),
      )
      .take(1000);
    for (const row of old) await ctx.db.delete(row._id);
    return { deleted: old.length };
  })
  .internal();
