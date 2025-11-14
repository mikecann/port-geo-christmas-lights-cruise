import { myAction, myMutation, myQuery } from "./lib";
import { entries } from "../features/entries/model";
import { v } from "convex/values";
import type { LatLng } from "../features/map/lib";
import { geocodeAddress } from "../features/map/lib";
import { internal } from "../../shared/api";

export const find = myQuery.input({}).handler(async ({ context }) => {
  return await entries.query(context).forUser(context.userId).find();
});

export const enter = myMutation
  .input({})
  .returns(v.null())
  .handler(async ({ context }) => {
    await entries.mutate(context).forUser(context.userId).create();
    return null;
  });

export const updateDraft = myMutation
  .input({
    houseAddress: v.optional(
      v.object({ address: v.string(), placeId: v.string() }),
    ),
    name: v.optional(v.string()),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await entries
      .mutate(context)
      .forUser(context.userId)
      .updateBeforeSubmission(input);
    return null;
  });

export const remove = myMutation
  .input({})
  .returns(v.null())
  .handler(async ({ context }) => {
    await entries.mutate(context).forUser(context.userId).remove(context);
    return null;
  });

export const updateApproved = myMutation
  .input({
    name: v.optional(v.string()),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await entries.mutate(context).forUser(context.userId).updateApproved(input);
    return null;
  });

export const submit = myAction
  .input({})
  .returns(v.null())
  .handler(async ({ context }) => {
    const entry = await context.runMutation(internal.entries.startSubmitting, {
      userId: context.userId,
    });

    if (entry.status != "submitting")
      throw new Error("Entry is not in submitting status");

    try {
      let latLng: LatLng = { lat: 0, lng: 0 };
      try {
        latLng = await geocodeAddress(entry.houseAddress.address);
      } catch (error) {
        // Revert to draft if geocoding fails
        await context.runMutation(internal.entries.revertToDraft, {
          userId: context.userId,
        });
        throw new Error(
          `Unable to find your address "${entry.houseAddress.address}". Please check the address and try again, or contact support if you believe this is an error.`,
        );
      }

      await context.runMutation(internal.entries.finalizeSubmission, {
        entryId: entry._id,
        lat: latLng.lat,
        lng: latLng.lng,
        placeId: entry.houseAddress.placeId,
      });

      return null;
    } catch (error) {
      // Revert entry to draft state on any error during submission
      try {
        await context.runMutation(internal.entries.revertToDraft, {
          userId: context.userId,
        });
      } catch (revertError) {
        // Log but don't throw - we want to propagate the original error
        console.error("Failed to revert entry to draft:", revertError);
      }
      throw error;
    }
  });
