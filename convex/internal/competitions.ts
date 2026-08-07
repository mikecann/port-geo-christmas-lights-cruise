import { competitions } from "../features/competitions/model";
import { convex, vv } from "../schema";

export const current = convex
  .query()
  .input({})
  .returns(vv.doc("competitions"))
  .handler(async (ctx) => await competitions.query(ctx).current())
  .internal();
