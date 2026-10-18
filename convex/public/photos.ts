import { photos } from "../features/photos/model";
import { v } from "convex/values";
import { convex } from "../schema";
import { entries } from "../features/entries/model";
import { publicPhotoValidator } from "../features/photos/schema";

export const listForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .returns(v.array(publicPhotoValidator))
  .handler(async (context, input) => {
    await entries.query(context).forEntry(input.entryId).getApproved();
    return await photos.forEntry(input.entryId).listPublic(context.db);
  })
  .public();

export const findFirstForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .returns(v.union(publicPhotoValidator, v.null()))
  .handler(async (context, input) => {
    await entries.query(context).forEntry(input.entryId).getApproved();
    return await photos.forEntry(input.entryId).findFirstPublic(context.db);
  })
  .public();
