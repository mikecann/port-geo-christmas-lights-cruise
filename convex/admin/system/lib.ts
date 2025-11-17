import { getAuthUserId } from "@convex-dev/auth/server";
import { ensure } from "../../../shared/ensure";
import { triggers } from "../../features/common/lib";
import { convex } from "../../schema";

export const userSystemAdminQueryMiddleware = convex
  .query()
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isSystemAdmin) throw new Error("User is not a system admin");

    return next({
      context: {
        ...context,
        getUser: async () => user,
      },
    });
  });

export const userSystemAdminQuery = convex
  .query()
  .use(userSystemAdminQueryMiddleware);

export const userSystemAdminMutationMiddleware = convex
  .mutation()
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isSystemAdmin) throw new Error("User is not a system admin");

    return next({
      context: {
        ...triggers.wrapDB(context),
        _db: context.db,
        storage: context.storage,
        getUser: async () => user,
      },
    });
  });

export const userSystemAdminMutation = convex
  .mutation()
  .use(userSystemAdminMutationMiddleware);
