import { query } from "../_generated/server";
import { photos } from "../features/photos/model";
import { v } from "convex/values";

export const listForEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    return await photos.forEntry(args.entryId).list(ctx.db);
  },
});

export const findFirstForEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    return await photos.forEntry(args.entryId).findFirst(ctx.db);
  },
});
