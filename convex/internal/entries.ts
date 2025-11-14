import { v } from "convex/values";
import { email } from "../features/email/model";
import { convex } from "../schema";
import {
  mutationServicesMiddleware,
  createUserMutationServices,
} from "../features/services";

export const startSubmitting = convex
  .mutation()
  .internal()
  .use(mutationServicesMiddleware)
  .input({
    userId: v.id("users"),
  })
  .handler(async ({ context, input }) => {
    const userServices = createUserMutationServices(context, input.userId);
    return await userServices.entries.startSubmitting();
  });

export const finalizeSubmission = convex
  .mutation()
  .internal()
  .use(mutationServicesMiddleware)
  .input({
    entryId: v.id("entries"),
    lat: v.number(),
    lng: v.number(),
    placeId: v.string(),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.get({
      entryId: input.entryId,
    });

    const userServices = createUserMutationServices(
      context,
      entry.submittedByUserId,
    );
    await userServices.entries.finalizeSubmission({
      lat: input.lat,
      lng: input.lng,
      placeId: input.placeId,
    });

    await email.sendNewEntryNotificationToCompetitionAdmins(context, {
      entryId: entry._id,
    });

    return null;
  });

export const revertToDraft = convex
  .mutation()
  .internal()
  .use(mutationServicesMiddleware)
  .input({
    userId: v.id("users"),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    const userServices = createUserMutationServices(context, input.userId);
    await userServices.entries.revertToDraft();
    return null;
  });
