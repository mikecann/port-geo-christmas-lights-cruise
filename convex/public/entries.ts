import { query } from "../_generated/server";
import { entries } from "../features/entries/model";
import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../_generated/api";
import { photos } from "../features/photos/model";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await entries.listApproved(ctx.db);
  },
});

export const listWithFirstPhoto = query({
  args: {},
  handler: async (ctx) => {
    const docs = await entries.listApproved(ctx.db);
    return await Promise.all(
      docs.map(async (entry) => ({
        entry,
        photo: await photos.forEntry(entry._id).findFirst(ctx.db),
      })),
    );
  },
});

export const listWithPhotos = query({
  args: {},
  handler: async (ctx) => {
    const docs = await entries.listApproved(ctx.db);
    return await Promise.all(
      docs.map(async (entry) => ({
        entry,
        photos: await photos.forEntry(entry._id).list(ctx.db),
      })),
    );
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    return await entries.countApproved(ctx.db);
  },
});

export const get = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).getApproved(ctx.db);
    return entry;
  },
});

export const find = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).find(ctx.db);
    if (!entry) return null;
    if (entry.status !== "approved") throw new Error("Entry is not approved");
    return entry;
  },
});

export const getWithPhotos = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const entry = await entries.forEntry(args.entryId).getApproved(ctx.db);
    return {
      entry,
      photos: await photos.forEntry(args.entryId).list(ctx.db),
    };
  },
});

export type EntryWithFirstPhoto = FunctionReturnType<
  typeof api.public.entries.listWithFirstPhoto
>[number];

export type EntryWithPhotos = FunctionReturnType<
  typeof api.public.entries.getWithPhotos
>;
