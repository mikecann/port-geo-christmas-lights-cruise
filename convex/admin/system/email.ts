import { userSystemAdminMutation } from "./lib";
import { email } from "../../features/email/model";

export const sendTestEmail = userSystemAdminMutation({
  args: {},
  handler: async (ctx, _args) => {
    const user = await ctx.getUser();
    if (!user.email) throw new Error("User has no email");

    await email.sendTestEmail(ctx, { to: user.email });
  },
});
