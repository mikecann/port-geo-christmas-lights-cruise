import { getAuthUserId } from "@convex-dev/auth/server";
import {
  customAction,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ensure } from "../../shared/ensure";
import { action, mutation, query } from "../_generated/server";
import { triggers } from "../features/common/lib";
import { convex } from "../schema";

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
        getUser: async () =>
          ensure(
            await context.db.get(userId),
            `couldnt find user with id ${userId}`,
          ),
      },
    });
  });

export const myQuery = convex.query().use(myQueryMiddleware);

// export const myQuery = customQuery(query, {
//   args: {},
//   input: async (ctx, _args) => {
//     const userId = await getAuthUserId(ctx);
//     if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);
//     return {
//       ctx: {
//         userId,
//         getUser: async () =>
//           ensure(
//             await ctx.db.get(userId),
//             `couldnt find user with id ${userId}`,
//           ),
//       },
//       args: {},
//     };
//   },
// });

export const myMutationMiddleware = convex
  .mutation()
  .middleware(async ({ context, next }) => {
    const userId = await getAuthUserId(context);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    return next({
      context: {
        ...context,
        userId,
        getUser: async () =>
          ensure(
            await context.db.get(userId),
            `couldnt find user with id ${userId}`,
          ),
      },
    });
  });

export const myMutation = convex.mutation().use(myMutationMiddleware);

// export const myMutation = customMutation(mutation, {
//   args: {},
//   input: async (_ctx, _args) => {
//     const userId = await getAuthUserId(_ctx);
//     if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);
//     return {
//       ctx: {
//         ...triggers.wrapDB(_ctx),
//         userId,
//         getUser: async () =>
//           ensure(
//             await _ctx.db.get(userId),
//             `couldnt find user with id ${userId}`,
//           ),
//       },
//       args: {},
//     };
//   },
// });

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

// export const myAction = customAction(action, {
//   args: {},
//   input: async (ctx, _args) => {
//     const userId = await getAuthUserId(ctx);
//     if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

//     return {
//       ctx: {
//         userId,
//       },
//       args: {},
//     };
//   },
// });
