import { myMutation, myQuery } from "./lib";
import { photos } from "../features/photos/model";
import { v } from "convex/values";
import { convex } from "../schema";

export const list = myQuery.input({}).handler(async ({ context }) => {
  const entry = await context.services.user.entries.get();
  return await photos.forEntry(entry._id).list(context.db);
});

export const listForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    return await photos.forEntry(input.entryId).list(context.db);
  });

export const beginUpload = myMutation.input({}).handler(async ({ context }) => {
  const entry = await context.services.user.entries.getForModification();
  const uploadStartedAt = Date.now();
  return await photos.forEntry(entry._id).add(context, { uploadStartedAt });
});

export const save = myMutation
  .input({
    storageId: v.id("_storage"),
    photoId: v.id("photos"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    const entry = await context.services.user.entries.get();
    context.userQueryServices.entries.ensureIsModifiable(entry);

    await photos.forPhoto(input.photoId).save(context, {
      storageId: input.storageId,
    });

    return null;
  });

export const remove = myMutation
  .input({
    photoId: v.id("photos"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    const entry = await context.services.user.entries.get();
    context.services.user.entries.ensureIsModifiable(entry);
    await photos.forPhoto(input.photoId).delete(context);
    return null;
  });
