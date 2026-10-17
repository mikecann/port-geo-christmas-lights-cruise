import { getAuthUserId } from "@convex-dev/auth/server";
import { ensure } from "../../../shared/ensure";
import { triggers } from "../../features/common/lib";
import { convex } from "../../schema";
import { ConvexError } from "convex/values";

// Production never sets this, so wipes only ever run on dev deployments
export function areDestructiveWipesAllowed() {
  return process.env.ALLOW_DESTRUCTIVE_WIPES === "true";
}

export function ensureDestructiveWipesAllowed() {
  if (!areDestructiveWipesAllowed())
    throw new ConvexError(
      "Wipes are turned off on this deployment. Set ALLOW_DESTRUCTIVE_WIPES=true on a dev deployment to use them.",
    );
}

export const userSystemAdminQueryMiddleware = convex
  .query()
  .createMiddleware(async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isSystemAdmin) throw new Error("User is not a system admin");

    return next({
      ...context,
      getUser: async () => user,
    });
  });

export const userSystemAdminQuery = convex
  .query()
  .use(userSystemAdminQueryMiddleware);

export const userSystemAdminMutationMiddleware = convex
  .mutation()
  .createMiddleware(async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isSystemAdmin) throw new Error("User is not a system admin");

    return next({
      ...triggers.wrapDB(context),
      storage: context.storage,
      getUser: async () => user,
    });
  });

export const userSystemAdminMutation = convex
  .mutation()
  .use(userSystemAdminMutationMiddleware);
