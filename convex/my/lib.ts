import { getAuthUserId } from "@convex-dev/auth/server";
import { ensure } from "../../shared/ensure";
import { triggers } from "../features/common/lib";
import { convex } from "../schema";
import {
  createUserQueryServices,
  createUserMutationServices,
  createQueryServices,
  createMutationServices,
} from "../features/services";

// With middleware
export const myQueryMiddleware = convex
  .query()
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    return next({
      context: {
        ...context,
        userId,
        services: {
          ...createQueryServices(context),
          user: {
            ...createUserQueryServices(context, userId),
          },
        },
        getUser: async () =>
          ensure(
            await context.db.get(userId),
            `couldnt find user with id ${userId}`,
          ),
      },
    });
  });

export const myQuery = convex.query().use(myQueryMiddleware);

export const myMutationMiddleware = convex
  .mutation()
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const mutationServices = createMutationServices(context);
    const userQueryServices = createUserQueryServices(context, userId);
    const userMutationServices = createUserMutationServices(context, userId);

    const mergedEntries = Object.assign(
      {},
      userQueryServices.entries,
      userMutationServices.entries,
    );

    return next({
      context: {
        ...triggers.wrapDB(context),
        userId,
        services: {
          ...mutationServices,
          user: {
            ...userQueryServices,
            ...userMutationServices,
            entries: mergedEntries,
          },
        },
        userQueryServices,
        getUser: async () =>
          ensure(
            await context.db.get(userId),
            `couldnt find user with id ${userId}`,
          ),
      },
    });
  });

export const myMutation = convex.mutation().use(myMutationMiddleware);

export const myActionMiddleware = convex
  .action()
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    return next({
      context: {
        ...context,
        userId,
      },
    });
  });

export const myAction = convex.action().use(myActionMiddleware);
