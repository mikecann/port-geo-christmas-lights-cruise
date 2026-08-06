import { convex } from "../schema";

// Wrappers to use for function that should only be called from tests
export const testingQueryMiddleware = convex
  .query()
  .createMiddleware(async (context, next) => {
    if (process.env.IS_TEST === undefined)
      throw new Error(
        "Calling a test only function in an unexpected environment",
      );

    return next({ context });
  });

export const testingQuery = convex.query().use(testingQueryMiddleware);

export const testingMutationMiddleware = convex
  .mutation()
  .createMiddleware(async (context, next) => {
    if (process.env.IS_TEST === undefined)
      throw new Error(
        "Calling a test only function in an unexpected environment",
      );

    return next({ context });
  });

export const testingMutation = convex.mutation().use(testingMutationMiddleware);

export const testingActionMiddleware = convex
  .action()
  .createMiddleware(async (context, next) => {
    if (process.env.IS_TEST === undefined)
      throw new Error(
        "Calling a test only function in an unexpected environment",
      );

    return next({ context });
  });

export const testingAction = convex.action().use(testingActionMiddleware);
