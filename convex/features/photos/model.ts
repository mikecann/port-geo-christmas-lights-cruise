import type { Id } from "../../_generated/dataModel";
import type {
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
} from "../../_generated/server";
import { ensure } from "../../../shared/ensure";
import { MAX_PHOTOS_PER_ENTRY } from "../../../shared/constants";
import { exhaustiveCheck } from "../../../shared/misc";

export const photos = {
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

        if (photo.kind === "mock") return;
        if (photo.uploadState.status == "uploading") return;

        if (photo.uploadState.status == "uploaded") {
          await ctx.storage.delete(photo.uploadState.storageId);
          return;
        }

        exhaustiveCheck(photo.uploadState);
      },

      async save(ctx: MutationCtx, args: { storageId: Id<"_storage"> }) {
        const photo = await this.get(ctx.db);
        if (photo.kind != "convex_stored")
          throw new Error(
            `Photo with id '${photoId}' is not a convex stored photo`,
          );

        if (photo.uploadState.status != "uploading")
          throw new Error(
            `Photo with id '${photoId}' is not in uploading state`,
          );

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
      },
    };
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

  async wipeAll(ctx: MutationCtx) {
    const allPhotos = await ctx.db.query("photos").collect();
    let deletedCount = 0;
    for (const photo of allPhotos) {
      await photos.forPhoto(photo._id).delete(ctx);
      deletedCount++;
    }
    return { deletedCount };
  },
};
