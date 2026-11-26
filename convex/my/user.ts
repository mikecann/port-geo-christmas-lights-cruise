import { v } from "convex/values";
import { userMutation } from "../features/common/auth";
import { cleanUserName } from "../features/users/model";

export const updateName = userMutation
  .input({ name: v.string() })
  .returns(v.null())
  .handler(async (context, input) => {
    await context.db.patch("users", context.userId, {
      name: cleanUserName(input.name),
    });
    return null;
  })
  .public();
