import { competitions } from "../features/competitions/model";
import { convex, vv } from "../schema";
import { v } from "convex/values";

export const current = convex
  .query()
  .input({})
  .returns(vv.doc("competitions"))
  .handler(async (ctx) => await competitions.query(ctx).current())
  .internal();

export const setCurrentEntriesOpen = convex
  .mutation()
  .input({ entriesOpen: v.boolean() })
  .returns(v.null())
  .handler(async (ctx, input) => {
    const competition = await competitions.query(ctx).current();
    await competitions
      .mutate(ctx)
      .setEntriesOpen(competition._id, input.entriesOpen);
    return null;
  })
  .internal();
