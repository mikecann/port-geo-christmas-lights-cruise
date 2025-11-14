import { userSystemAdminQuery, userSystemAdminMutation } from "./lib";
import { v } from "convex/values";

export const listPage = userSystemAdminQuery
  .input({
    offset: v.number(),
    numItems: v.number(),
  })
  .handler(async ({ context, input }) => {
    const allUsers = await context.db.query("users").collect();
    const sortedUsers = allUsers.sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    return sortedUsers.slice(input.offset, input.offset + input.numItems);
  });

export const count = userSystemAdminQuery
  .input({})
  .returns(v.number())
  .handler(async ({ context }) => {
    const allUsers = await context.db.query("users").collect();
    return allUsers.length;
  });

export const toggleSystemAdmin = userSystemAdminMutation
  .input({
    userId: v.id("users"),
    enabled: v.boolean(),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await context.db.patch(input.userId, {
      isSystemAdmin: input.enabled ? true : undefined,
    });
    return null;
  });

export const toggleCompetitionAdmin = userSystemAdminMutation
  .input({
    userId: v.id("users"),
    enabled: v.boolean(),
  })
  .returns(v.null())
  .handler(async ({ context, input }) => {
    await context.db.patch(input.userId, {
      isCompetitionAdmin: input.enabled ? true : undefined,
    });
    return null;
  });
