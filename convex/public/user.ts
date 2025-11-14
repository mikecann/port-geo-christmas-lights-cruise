import type { Doc } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { convex } from "../schema";

export const find = convex
  .query()
  .input({})
  .handler(async ({ context }): Promise<Me | null> => {
    const userId = await getAuthUserId(context);
    if (userId === null) return null;
    return await context.db.get(userId);
  });

export type Me = Doc<"users">;
