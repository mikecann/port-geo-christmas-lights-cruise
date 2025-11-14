import { userSystemAdminMutation } from "./lib";
import { email } from "../../features/email/model";
import { v } from "convex/values";

export const sendTestEmail = userSystemAdminMutation
  .input({})
  .returns(v.null())
  .handler(async ({ context }) => {
    const user = await context.getUser();
    if (!user.email) throw new Error("User has no email");

    await email.sendTestEmail(context, { to: user.email });
    return null;
  });
