import { getAuthUserId } from "@convex-dev/auth/server";
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ensure } from "../../../shared/ensure";
import { mutation, query } from "../../_generated/server";
import { triggers } from "../../features/common/lib";

export const userCompetitionAdminQuery = customQuery(query, {
  args: {},
  input: async (ctx, _args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await ctx.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isCompetitionAdmin)
      throw new Error("User is not a competition admin");

    return {
      ctx: {
        getUser: async () => user,
      },
      args: {},
    };
  },
});
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
