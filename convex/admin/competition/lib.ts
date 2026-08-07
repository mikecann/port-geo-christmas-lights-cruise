import { getAuthUserId } from "@convex-dev/auth/server";
import { ensure } from "../../../shared/ensure";
import { triggers } from "../../features/common/lib";
import { convex } from "../../schema";
import { v } from "convex/values";
import { internal } from "../../../convex/_generated/api";

export const userCompetitionAdminQueryMiddleware = convex
  .query()
  .createMiddleware(async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isCompetitionAdmin && !user.isSystemAdmin)
      throw new Error("User is not a competition admin or system admin");

    return next({
      ...context,
      getUser: async () => user,
    });
  });

export const userCompetitionAdminQuery = convex
  .query()
  .use(userCompetitionAdminQueryMiddleware);

// export const userCompetitionAdminQuery = customQuery(query, {
//   args: {},
//   input: async (ctx, _args) => {
//     return {
//       ctx: {},
//       args: {},
//     };
//   },
// });

export const userCompetitionAdminMutationMiddleware = convex
  .mutation()
  .createMiddleware(async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isCompetitionAdmin && !user.isSystemAdmin)
      throw new Error("User is not a competition admin or system admin");

    return next({
      ...triggers.wrapDB(context),
      getUser: async () => user,
    });
  });

export const userCompetitionAdminMutation = convex
  .mutation()
  .use(userCompetitionAdminMutationMiddleware);

// Internal query to check admin status (used by action middleware)
export const checkAdminStatus = convex
  .query()
  .input({
    userId: v.id("users"),
  })
  .returns(
    v.object({
      isCompetitionAdmin: v.boolean(),
      isSystemAdmin: v.boolean(),
    }),
  )
  .handler(async (context, input) => {
    const user = await context.db.get(input.userId);
    if (!user) throw new Error("User not found");
    return {
      isCompetitionAdmin: user.isCompetitionAdmin ?? false,
      isSystemAdmin: user.isSystemAdmin ?? false,
    };
  })
  .internal();

export const userCompetitionAdminActionMiddleware = convex
  .action()
  .createMiddleware(async (context, next) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    // Check admin status using an internal query since actions can't access db directly
    const userCheck = await context.runQuery(
      internal.admin.competition.lib.checkAdminStatus,
      {
        userId,
      },
    );

    if (!userCheck.isCompetitionAdmin && !userCheck.isSystemAdmin)
      throw new Error("User is not a competition admin or system admin");

    return next({
      ...context,
      userId,
    });
  });

export const userCompetitionAdminAction = convex
  .action()
  .use(userCompetitionAdminActionMiddleware);
