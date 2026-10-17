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
