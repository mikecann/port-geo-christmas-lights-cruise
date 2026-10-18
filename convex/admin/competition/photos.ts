import { v } from "convex/values";
import { photos } from "../../features/photos/model";
import {
  competitionAdminMutation,
  competitionAdminQuery,
} from "../../features/common/auth";

/** Photos for admin review, including entries that are not public yet. */
export const listForEntry = competitionAdminQuery
  .input({ entryId: v.id("entries") })
  .handler(async (ctx, input) => {
    return await photos.forEntry(input.entryId).list(ctx.db);
  })
  .public();

export const beginUpload = competitionAdminMutation
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    const uploadStartedAt = Date.now();
    return await photos.forEntry(input.entryId).add(context, {
      uploadStartedAt,
    });
  })
  .public();

export const save = competitionAdminMutation
  .input({
    storageId: v.id("_storage"),
    photoId: v.id("photos"),
  })
  .returns(v.union(v.null(), v.object({ error: v.string() })))
  .handler(async (context, input) => {
    return await photos.forPhoto(input.photoId).save(context, {
      storageId: input.storageId,
    });
  })
  .public();

export const remove = competitionAdminMutation
  .input({
    photoId: v.id("photos"),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    await photos.forPhoto(input.photoId).delete(context);
    return null;
  })
  .public();
