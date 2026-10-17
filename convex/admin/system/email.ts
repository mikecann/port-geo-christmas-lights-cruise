import { systemAdminMutation } from "../../features/common/auth";
import { email } from "../../features/email/model";
import { v } from "convex/values";

export const sendTestEmail = systemAdminMutation
  .input({})
  .handler(async (context) => {
    const user = context.user;
    if (!user.email) throw new Error("User has no email");

    await email.sendTestEmail(context, { to: user.email });
    return null;
  })
  .public();
