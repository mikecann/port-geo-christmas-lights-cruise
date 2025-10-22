import { getAuthUserId } from "@convex-dev/auth/server";
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ensure } from "../../../shared/ensure";
import { mutation, query } from "../../_generated/server";
import { triggers } from "../../features/common/lib";

export const userSystemAdminQuery = customQuery(query, {
  args: {},
  input: async (_ctx, _args) => {
    const userId = await getAuthUserId(_ctx);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await _ctx.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isSystemAdmin) throw new Error("User is not a system admin");

    return {
      ctx: {
        getUser: async () => user,
      },
      args: {},
    };
  },
});
export const userSystemAdminMutation = customMutation(mutation, {
  args: {},
  input: async (_ctx, _args) => {
    const userId = await getAuthUserId(_ctx);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);

    const user = ensure(
      await _ctx.db.get(userId),
      `couldnt find user with id ${userId}`,
    );

    if (!user.isSystemAdmin) throw new Error("User is not a system admin");

    return {
      ctx: {
        ...triggers.wrapDB(_ctx),
        _db: _ctx.db,
        getUser: async () => user,
      },
      args: {},
    };
  },
});
