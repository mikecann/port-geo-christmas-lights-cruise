import type { Id } from "../../_generated/dataModel";
import type {
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
} from "../../_generated/server";
import { ConvexError } from "convex/values";
import { ensure } from "../../../shared/ensure";
import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  MAX_PHOTO_UPLOAD_BYTES,
  MAX_PHOTOS_PER_ENTRY,
} from "../../../shared/constants";
import { exhaustiveCheck } from "../../../shared/misc";
import { isNotNullOrUndefined } from "../../../shared/filter";
import type { PhotoDoc, PublicPhoto } from "./schema";

// The upload's storage timestamp can land slightly before uploadStartedAt
const UPLOAD_CLOCK_SKEW_MS = 5_000;

const UPLOAD_NOT_SAVED_MESSAGE =
  "Sorry, we couldn't save that photo. Please try uploading it again.";

export const photos = {
  toPublic(photo: PhotoDoc): PublicPhoto | null {
    const { _id, entryId } = photo;
    if (photo.kind === "mock")
      return { _id, entryId, kind: "mock", mockPath: photo.mockPath };
    if (photo.uploadState.status === "uploading") return null;
    return { _id, entryId, kind: "convex_stored", url: photo.uploadState.url };
  },

  forPhoto(photoId: Id<"photos">) {
    return {
      find(db: DatabaseReader) {
        return db.get(photoId);
      },

      async get(db: DatabaseReader) {
        const photo = await this.find(db);
        return ensure(photo, `Photo with id '${photoId}' not found`);
      },

      async delete(ctx: MutationCtx) {
        const photo = await this.find(ctx.db);
        if (!photo) return;

        // Mock and still-uploading photos have no stored file to remove
        if (photo.kind === "mock" || photo.uploadState.status == "uploading") {
          await ctx.db.delete(photoId);
          return;
        }

        if (photo.uploadState.status == "uploaded") {
          const { storageId } = photo.uploadState;
          await ctx.db.delete(photoId);
          // Never remove a file that another photo still points at
          if (!(await photos.isStorageReferenced(ctx.db, storageId)))
            await ctx.storage.delete(storageId);
          return;
        }

        exhaustiveCheck(photo.uploadState);
      },

      // Returns an error message instead of throwing when the file gets
      // deleted, because throwing would roll the delete back.
      async save(
        ctx: MutationCtx,
        args: { storageId: Id<"_storage"> },
      ): Promise<{ error: string } | null> {
        const photo = await this.get(ctx.db);
        if (photo.kind != "convex_stored")
          throw new Error(
            `Photo with id '${photoId}' is not a convex stored photo`,
          );

        if (photo.uploadState.status != "uploading")
          throw new Error(
            `Photo with id '${photoId}' is not in uploading state`,
          );

        const file = await ctx.db.system.get(args.storageId);
        if (!file) throw new ConvexError(UPLOAD_NOT_SAVED_MESSAGE);

        // Files that are older than this upload or already in use belong to
        // someone else, so refuse them and leave them alone.
        if (await photos.isStorageReferenced(ctx.db, args.storageId))
          throw new ConvexError(UPLOAD_NOT_SAVED_MESSAGE);
        if (
          file._creationTime <
          photo.uploadState.uploadStartedAt - UPLOAD_CLOCK_SKEW_MS
        )
          throw new ConvexError(UPLOAD_NOT_SAVED_MESSAGE);

        const isAllowedType = ALLOWED_PHOTO_CONTENT_TYPES.includes(
          file.contentType ?? "",
        );
        const problem = isAllowedType
          ? file.size > MAX_PHOTO_UPLOAD_BYTES
            ? "Photos must be 5 MB or smaller."
            : null
          : "Photos must be JPEG, PNG or WebP images.";
        if (problem) {
          await ctx.storage.delete(args.storageId);
          await ctx.db.delete(photoId);
          return { error: problem };
        }

        // Get the URL for the uploaded file
        const url = await ctx.storage.getUrl(args.storageId);
        if (!url)
          throw new Error(
            `Failed to get URL for storage ID '${args.storageId}'`,
          );

        // Update the photo to "uploaded" state
        await ctx.db.patch(photoId, {
          kind: "convex_stored" as const,
          uploadState: {
            status: "uploaded" as const,
            storageId: args.storageId,
            url: url,
          },
        });
        return null;
      },
    };
  },

  async isStorageReferenced(db: DatabaseReader, storageId: Id<"_storage">) {
    const photo = await db
      .query("photos")
      .withIndex("by_uploadState_storageId", (q) =>
        q.eq("uploadState.storageId", storageId),
      )
      .first();
    return photo !== null;
  },

  forEntry(entryId: Id<"entries">) {
    return {
      async list(db: DatabaseReader) {
        return await db
          .query("photos")
          .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
          .collect();
      },

      async findFirst(db: DatabaseReader) {
        return await db
          .query("photos")
          .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
          .first();
      },

      async listPublic(db: DatabaseReader) {
        const allPhotos = await this.list(db);
        return allPhotos.map(photos.toPublic).filter(isNotNullOrUndefined);
      },

      async findFirstPublic(db: DatabaseReader) {
        const [first] = await this.listPublic(db);
        return first ?? null;
      },

      async count(db: DatabaseReader) {
        const allPhotos = await this.list(db);
        return allPhotos.length;
      },

      async add(
        ctx: MutationCtx,
        args: {
          uploadStartedAt: number;
        },
      ) {
        const photoCount = await this.count(ctx.db);

        if (photoCount >= MAX_PHOTOS_PER_ENTRY)
          throw new Error(
            `Entry '${entryId}' already has the maximum number of photos (${MAX_PHOTOS_PER_ENTRY})`,
          );

        const uploadUrl = await ctx.storage.generateUploadUrl();

        const photoId = await ctx.db.insert("photos", {
          entryId,
          kind: "convex_stored" as const,
          uploadState: {
            status: "uploading",
            uploadStartedAt: args.uploadStartedAt,
            uploadUrl,
          },
        });

        return { photoId, uploadUrl };
      },

      async deleteAll(ctx: MutationCtx) {
        const allPhotos = await this.list(ctx.db);
        for (const photo of allPhotos)
          await photos.forPhoto(photo._id).delete(ctx);
      },
    };
  },
};
