import { myMutation, myQuery } from "./lib";
import { entries } from "../features/entries/model";
import { photos } from "../features/photos/model";
import { v } from "convex/values";
import { query } from "../_generated/server";

export const list = myQuery({
  args: {},
  handler: async (ctx) => {
    const entry = await entries.query(ctx).forUser(ctx.userId).get();
    return await photos.forEntry(entry._id).list(ctx.db);
  },
});

export const listForEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    return await photos.forEntry(args.entryId).list(ctx.db);
  },
});

export const beginUpload = myMutation({
  args: {},
  handler: async (ctx) => {
    const entry = await entries
      .query(ctx)
      .forUser(ctx.userId)
      .getForModification();
    const uploadStartedAt = Date.now();
    return await photos.forEntry(entry._id).add(ctx, { uploadStartedAt });
  },
});

export const save = myMutation({
  args: {
    storageId: v.id("_storage"),
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    await entries.query(ctx).forUser(ctx.userId).ensureIsModifiable();

    await photos.forPhoto(args.photoId).save(ctx, {
      storageId: args.storageId,
    });

    return null;
  },
});

export const remove = myMutation({
  args: {
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    await entries.query(ctx).forUser(ctx.userId).ensureIsModifiable();
    await photos.forPhoto(args.photoId).delete(ctx);
    return null;
  },
});
