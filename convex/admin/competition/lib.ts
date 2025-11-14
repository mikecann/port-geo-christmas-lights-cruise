import { getAuthUserId } from "@convex-dev/auth/server";
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ensure } from "../../../shared/ensure";
import { mutation, query } from "../../_generated/server";
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

export const userCompetitionAdminMutation = customMutation(mutation, {
  args: {},
  input: async (_ctx, _args) => {
    const userId = await getAuthUserId(_ctx);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await _ctx.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isCompetitionAdmin)
      throw new Error("User is not a competition admin");

    return {
      ctx: {
        ...triggers.wrapDB(_ctx),
        getUser: async () => user,
      },
      args: {},
    };
  },
});
