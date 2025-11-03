import { userSystemAdminQuery, userSystemAdminMutation } from "./lib";
import { v } from "convex/values";

export const listPage = userSystemAdminQuery({
  args: {
    offset: v.number(),
    numItems: v.number(),
  },
  handler: async (ctx, { offset, numItems }) => {
    const allUsers = await ctx.db.query("users").collect();
    const sortedUsers = allUsers.sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    return sortedUsers.slice(offset, offset + numItems);
  },
});

export const count = userSystemAdminQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.length;
  },
});

export const toggleSystemAdmin = userSystemAdminMutation({
  args: {
    userId: v.id("users"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, enabled }) => {
    await ctx.db.patch(userId, { isSystemAdmin: enabled ? true : undefined });
    return null;
  },
});

export const toggleCompetitionAdmin = userSystemAdminMutation({
  args: {
    userId: v.id("users"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, enabled }) => {
    await ctx.db.patch(userId, {
      isCompetitionAdmin: enabled ? true : undefined,
    });
    return null;
  },
});
