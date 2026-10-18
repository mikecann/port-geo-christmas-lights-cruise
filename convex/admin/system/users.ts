import {
  systemAdminMutation,
  systemAdminQuery,
} from "../../features/common/auth";
import { v } from "convex/values";

export const listPage = systemAdminQuery
  .input({
    offset: v.number(),
    numItems: v.number(),
  })
  .handler(async (context, input) => {
    const allUsers = await context.db.query("users").collect();
    const sortedUsers = allUsers.sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    return sortedUsers.slice(input.offset, input.offset + input.numItems);
  })
  .public();

export const count = systemAdminQuery
  .input({})
  .returns(v.number())
  .handler(async (context) => {
    const allUsers = await context.db.query("users").collect();
    return allUsers.length;
  })
  .public();

export const toggleSystemAdmin = systemAdminMutation
  .input({
    userId: v.id("users"),
    enabled: v.boolean(),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    await context.db.patch(input.userId, {
      isSystemAdmin: input.enabled ? true : undefined,
    });
    return null;
  })
  .public();

export const toggleCompetitionAdmin = systemAdminMutation
  .input({
    userId: v.id("users"),
    enabled: v.boolean(),
  })
  .returns(v.null())
  .handler(async (context, input) => {
    await context.db.patch(input.userId, {
      isCompetitionAdmin: input.enabled ? true : undefined,
    });
    return null;
  })
  .public();
