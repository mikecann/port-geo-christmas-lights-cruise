import { photos } from "../features/photos/model";
import { v } from "convex/values";
import { convex } from "../schema";
import { entries } from "../features/entries/model";

export const listForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    await entries.query(context).forEntry(input.entryId).getApproved();
    return await photos.forEntry(input.entryId).list(context.db);
  })
  .public();

export const findFirstForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    await entries.query(context).forEntry(input.entryId).getApproved();
    return await photos.forEntry(input.entryId).findFirst(context.db);
  })
  .public();
