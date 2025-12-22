import { userCompetitionAdminMutation } from "./lib";
import { photos } from "../../features/photos/model";
import { v } from "convex/values";

export const beginUpload = userCompetitionAdminMutation
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    const uploadStartedAt = Date.now();
    return await photos.forEntry(input.entryId).add(context, { uploadStartedAt });
  });

export const save = userCompetitionAdminMutation
  .input({
    storageId: v.id("_storage"),
    photoId: v.id("photos"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await photos.forPhoto(input.photoId).save(context, {
      storageId: input.storageId,
    });
    return null;
  });

export const remove = userCompetitionAdminMutation
  .input({
    photoId: v.id("photos"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await photos.forPhoto(input.photoId).delete(context);
    return null;
  });

