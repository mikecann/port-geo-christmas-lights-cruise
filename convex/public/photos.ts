import { photos } from "../features/photos/model";
import { v } from "convex/values";
import { convex } from "../schema";

export const listForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    return await photos.forEntry(input.entryId).list(context.db);
  });

export const findFirstForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    return await photos.forEntry(input.entryId).findFirst(context.db);
  });
