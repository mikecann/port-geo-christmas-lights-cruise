import { v } from "convex/values";
import { convex } from "../schema";
import { ROLES, users } from "../features/users/model";

export const hasRole = convex
  .query()
  .input({
    userId: v.id("users"),
    role: v.union(...ROLES.map((role) => v.literal(role))),
  })
  .returns(v.boolean())
  .handler(async (context, input) => {
    const user = await context.db.get(input.userId);
    return user !== null && users.hasRole(user, input.role);
  })
  .internal();
