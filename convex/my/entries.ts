import { myAction, myMutation, myQuery } from "./lib";
import { entries } from "../features/entries/model";
import { v } from "convex/values";
import type { LatLng } from "../features/map/lib";
import { geocodeAddress } from "../features/map/lib";
import { internal } from "../../shared/api";

export const find = myQuery({
  args: {},
  handler: async (ctx) => {
    return await entries.forUser(ctx.userId).find(ctx.db);
  },
});

export const enter = myMutation({
  args: {},
  handler: async (ctx) => {
    await entries.forUser(ctx.userId).create(ctx.db);
    return null;
  },
});

export const updateDraft = myMutation({
  args: {
    houseAddress: v.optional(
      v.object({ address: v.string(), placeId: v.string() }),
    ),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await entries.forUser(ctx.userId).updateBeforeSubmission(ctx.db, args);
    return null;
  },
});

export const remove = myMutation({
  args: {},
  handler: async (ctx) => {
    await entries.forUser(ctx.userId).remove(ctx);
    return null;
  },
});

export const updateApproved = myMutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await entries.forUser(ctx.userId).updateApproved(ctx.db, args);
    return null;
  },
});

export const submit = myAction({
  args: {},
  handler: async (ctx) => {
    const entry = await ctx.runMutation(internal.entries.startSubmitting, {
      userId: ctx.userId,
    });

    if (entry.status != "submitting")
      throw new Error("Entry is not in submitting status");

    let latLng: LatLng = { lat: 0, lng: 0 };
    try {
      latLng = await geocodeAddress(entry.houseAddress.address);
    } catch (error) {
      console.error(error);
      console.error(
        `Unable to find your address "${entry.houseAddress.address}". Please check the address and try again, or contact support if you believe this is an error.`,
      );
    }

    await ctx.runMutation(internal.entries.finalizeSubmission, {
      entryId: entry._id,
      lat: latLng.lat,
      lng: latLng.lng,
      placeId: entry.houseAddress.placeId,
    });

    return null;
  },
});
