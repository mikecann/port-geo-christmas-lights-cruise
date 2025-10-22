import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const find = query({
  handler: async (ctx): Promise<Me | null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

export type Me = Doc<"users">;
