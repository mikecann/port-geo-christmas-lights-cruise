import { getAuthUserId } from "@convex-dev/auth/server";
import { ensure } from "../../../shared/ensure";
import { triggers } from "../../features/common/lib";
import { convex } from "../../schema";

export const userCompetitionAdminQueryMiddleware = convex
  .query()
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isCompetitionAdmin)
      throw new Error("User is not a competition admin");

    return next({
      context: {
        ...context,
        getUser: async () => user,
      },
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
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await context.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isCompetitionAdmin)
      throw new Error("User is not a competition admin");

    return next({
      context: {
        ...triggers.wrapDB(context),
        getUser: async () => user,
      },
    });
  });

export const userCompetitionAdminMutation = convex
  .mutation()
  .use(userCompetitionAdminMutationMiddleware);
