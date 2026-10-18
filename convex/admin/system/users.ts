import { systemAdminMutation } from "../../features/common/auth";
import { v } from "convex/values";

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
