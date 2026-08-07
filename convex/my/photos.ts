import { myMutation, myQuery } from "./lib";
import { entries } from "../features/entries/model";
import { photos } from "../features/photos/model";
import { v } from "convex/values";
import { convex } from "../schema";
import { competitions } from "../features/competitions/model";

export const list = myQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const entry = await entries
      .query(context)
      .forUser(competition._id, context.userId)
      .get();
    return await photos.forEntry(entry._id).list(context.db);
  })
  .public();

export const listForEntry = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    return await photos.forEntry(input.entryId).list(context.db);
  })
  .public();

export const beginUpload = myMutation
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const entry = await entries
      .query(context)
      .forUser(competition._id, context.userId)
      .getForModification();
    const uploadStartedAt = Date.now();
    return await photos.forEntry(entry._id).add(context, { uploadStartedAt });
  })
  .public();

export const save = myMutation
  .input({
    storageId: v.id("_storage"),
    photoId: v.id("photos"),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await entries
      .query(context)
      .forUser(competition._id, context.userId)
      .ensureIsModifiable();

    await photos.forPhoto(input.photoId).save(context, {
      storageId: input.storageId,
    });

    return null;
  })
  .public();

export const remove = myMutation
  .input({
    photoId: v.id("photos"),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await entries
      .query(context)
      .forUser(competition._id, context.userId)
      .ensureIsModifiable();
    await photos.forPhoto(input.photoId).delete(context);
    return null;
  })
  .public();
