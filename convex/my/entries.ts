import { userAction, userMutation, userQuery } from "../features/common/auth";
import { entries } from "../features/entries/model";
import { ConvexError, v } from "convex/values";
import type { GeocodedPlace } from "../features/map/lib";
import { geocodeAddress } from "../features/map/lib";
import { internal } from "../../shared/api";
import { competitions } from "../features/competitions/model";
import { enforceUserRateLimit } from "../features/rateLimits/lib";

export const find = userQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    return await entries
      .query(context)
      .forUser(competition._id, context.userId)
      .find();
  })
  .public();

export const listPrevious = userQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    return await entries
      .query(context)
      .forUser(competition._id, context.userId)
      .listPrevious();
  })
  .public();

export const enter = userMutation
  .input({})
  .returns(v.null())
  .handler(async (context) => {
    await enforceUserRateLimit(context, "enterCompetition", context.userId);
    const competition = await competitions.query(context).current();
    if (!competition.entriesOpen)
      throw new ConvexError("Competition entries are currently closed");
    await entries
      .mutate(context)
      .forUser(competition._id, context.userId)
      .create();
    return null;
  })
  .public();

export const updateDraft = userMutation
  .input({
    houseAddress: v.optional(
      v.object({ address: v.string(), placeId: v.string() }),
    ),
    name: v.optional(v.string()),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await entries
      .mutate(context)
      .forUser(competition._id, context.userId)
      .updateBeforeSubmission(input);
    return null;
  })
  .public();

export const remove = userMutation
  .input({})
  .returns(v.null())
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    await entries
      .mutate(context)
      .forUser(competition._id, context.userId)
      .remove();
    return null;
  })
  .public();

export const updateApproved = userMutation
  .input({
    name: v.optional(v.string()),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await entries
      .mutate(context)
      .forUser(competition._id, context.userId)
      .updateApproved(input);
    return null;
  })
  .public();

export const submit = userAction
  .input({})
  .returns(v.null())
  .handler(async (context) => {
    await enforceUserRateLimit(context, "submitEntry", context.userId);
    const entry = await context.runMutation(internal.entries.startSubmitting, {
      userId: context.userId,
    });

    if (entry.status != "submitting")
      throw new Error("Entry is not in submitting status");

    try {
      let place: GeocodedPlace;
      try {
        place = await geocodeAddress(entry.houseAddress.address);
      } catch (error) {
        // Revert to draft if geocoding fails
        await context.runMutation(internal.entries.revertToDraft, {
          userId: context.userId,
        });
        throw Object.assign(
          new ConvexError(
            `Unable to find your address "${entry.houseAddress.address}". Please check the address and try again, or contact support if you believe this is an error.`,
          ),
          { cause: error },
        );
      }

      await context.runMutation(internal.entries.finalizeSubmission, {
        entryId: entry._id,
        lat: place.lat,
        lng: place.lng,
        placeId: place.placeId,
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
  })
  .public();
