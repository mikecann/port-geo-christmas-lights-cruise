import { getAuthUserId } from "@convex-dev/auth/server";
import { ensure } from "../../shared/ensure";
import { mutation, NOT_SIGNED_IN_MESSAGE } from "../features/common/lib";
import { ConvexError } from "convex/values";
import { convex } from "../schema";

// With middleware
export const myQueryMiddleware = convex
  .query()
  .createMiddleware(async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new ConvexError(NOT_SIGNED_IN_MESSAGE);

    return next({
      ...context,
      userId,
      getUser: async () =>
        ensure(
          await context.db.get(userId),
          `couldnt find user with id ${userId}`,
        ),
    });
  });

export const myQuery = convex.query().use(myQueryMiddleware);

export const myMutationMiddleware = mutation.createMiddleware(
  async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new ConvexError(NOT_SIGNED_IN_MESSAGE);

    return next({
      ...context,
      userId,
      getUser: async () =>
        ensure(
          await context.db.get(userId),
          `couldnt find user with id ${userId}`,
        ),
    });
  },
);

export const myMutation = mutation.use(myMutationMiddleware);

export const myActionMiddleware = convex
  .action()
  .createMiddleware(async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new ConvexError(NOT_SIGNED_IN_MESSAGE);

    return next({
      ...context,
      userId,
    });
  });

export const myAction = convex.action().use(myActionMiddleware);
