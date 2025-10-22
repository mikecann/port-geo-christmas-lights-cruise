import {
  customAction,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";

// Wrappers to use for function that should only be called from tests
export const testingQuery = customQuery(query, {
  args: {},
  input: async (_ctx, _args) => {
    if (process.env.IS_TEST === undefined)
      throw new Error(
        "Calling a test only function in an unexpected environment",
      );

    return { ctx: {}, args: {} };
  },
});

export const testingMutation = customMutation(mutation, {
  args: {},
  input: async (_ctx, _args) => {
    if (process.env.IS_TEST === undefined)
      throw new Error(
        "Calling a test only function in an unexpected environment",
      );

    return { ctx: {}, args: {} };
  },
});

export const testingAction = customAction(action, {
  args: {},
  input: async (_ctx, _args) => {
    if (process.env.IS_TEST === undefined)
      throw new Error(
        "Calling a test only function in an unexpected environment",
      );

    return { ctx: {}, args: {} };
  },
});
