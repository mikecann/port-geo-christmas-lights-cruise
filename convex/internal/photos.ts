import { v } from "convex/values";
import { convex } from "../schema";
import { mutation } from "../features/common/lib";
import { photos } from "../features/photos/model";
import {
  hasImageSignature,
  IMAGE_SIGNATURE_BYTES,
} from "../features/photos/lib";
import { internal } from "../../shared/api";

// Scheduled by save, because a mutation can't read the file's bytes
export const checkUploadedImage = convex
  .action()
  .input({ photoId: v.id("photos"), storageId: v.id("_storage") })
  .returns(v.null())
  .handler(async (context, input) => {
    const blob = await context.storage.get(input.storageId);
    if (!blob) return null;
    const head = new Uint8Array(
      await blob.slice(0, IMAGE_SIGNATURE_BYTES).arrayBuffer(),
    );
    if (hasImageSignature(head)) return null;

    console.warn(
      `Removing photo '${input.photoId}': its file isn't a JPEG, PNG or WebP`,
    );
    await context.runMutation(internal.photos.removeNonImage, input);
    return null;
  })
  .internal();

export const removeNonImage = mutation
  .input({ photoId: v.id("photos"), storageId: v.id("_storage") })
  .returns(v.null())
  .handler(async (context, input) => {
    const photo = await photos.forPhoto(input.photoId).find(context.db);
    // The entrant may have removed or replaced it since
    if (
      photo?.kind !== "convex_stored" ||
      photo.uploadState.status !== "uploaded" ||
      photo.uploadState.storageId !== input.storageId
    )
      return null;
    // Also deletes the file unless another photo still points at it
    await photos.forPhoto(input.photoId).delete(context);
    return null;
  })
  .internal();

// Uploaded photos save their full file URL, which names the deployment's
// host. After moving the data to a new deployment, run this once to point
// them at the new host. It pages through the table and reschedules itself,
// and only patches URLs that changed, so it's safe to run again.
export const refreshPhotoUrls = mutation
  .input({
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
    updated: v.optional(v.number()),
    missing: v.optional(v.number()),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const batchSize = input.batchSize ?? 100;
    let updated = input.updated ?? 0;
    let missing = input.missing ?? 0;
    const page = await context.db
      .query("photos")
      .paginate({ cursor: input.cursor ?? null, numItems: batchSize });

    for (const photo of page.page) {
      if (photo.kind !== "convex_stored") continue;
      if (photo.uploadState.status !== "uploaded") continue;
      const { storageId } = photo.uploadState;
      const url = await context.storage.getUrl(storageId);
      // Left as is so nothing is lost if the file turns up later
      if (!url) {
        console.warn(
          `Photo '${photo._id}' has no stored file '${storageId}', leaving it alone`,
        );
        missing++;
        continue;
      }
      if (url === photo.uploadState.url) continue;
      await context.db.patch(photo._id, {
        uploadState: { ...photo.uploadState, url },
      });
      updated++;
    }

    if (!page.isDone) {
      await context.scheduler.runAfter(0, internal.photos.refreshPhotoUrls, {
        cursor: page.continueCursor,
        batchSize,
        updated,
        missing,
      });
      return null;
    }

    console.log(
      `Refreshed photo URLs: ${updated} updated, ${missing} with no stored file`,
    );
    return null;
  })
  .internal();
