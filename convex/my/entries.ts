import { myAction, myMutation, myQuery } from "./lib";
import { entries } from "../features/entries/model";
import { v } from "convex/values";
import type { LatLng } from "../features/map/lib";
import { geocodeAddress } from "../features/map/lib";
import { internal } from "../../shared/api";

export const find = myQuery({
  args: {},
  handler: async (ctx) => {
    return await entries.query(ctx).forUser(ctx.userId).find();
  },
});

export const enter = myMutation({
  args: {},
  handler: async (ctx) => {
    await entries.mutate(ctx).forUser(ctx.userId).create();
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
    await entries.mutate(ctx).forUser(ctx.userId).updateBeforeSubmission(args);
    return null;
  },
});

export const remove = myMutation({
  args: {},
  handler: async (ctx) => {
    await entries.mutate(ctx).forUser(ctx.userId).remove(ctx);
    return null;
  },
});

export const updateApproved = myMutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await entries.mutate(ctx).forUser(ctx.userId).updateApproved(args);
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

    try {
      let latLng: LatLng = { lat: 0, lng: 0 };
      try {
        latLng = await geocodeAddress(entry.houseAddress.address);
      } catch (error) {
        // Revert to draft if geocoding fails
        await ctx.runMutation(internal.entries.revertToDraft, {
          userId: ctx.userId,
        });
        throw new Error(
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
    } catch (error) {
      // Revert entry to draft state on any error during submission
      try {
        await ctx.runMutation(internal.entries.revertToDraft, {
          userId: ctx.userId,
        });
      } catch (revertError) {
        // Log but don't throw - we want to propagate the original error
        console.error("Failed to revert entry to draft:", revertError);
      }
      throw error;
    }
  },
});
