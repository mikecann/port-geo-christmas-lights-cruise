import { components } from "../../_generated/api";
import { Resend } from "@convex-dev/resend";
import type { MutationCtx } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { entries } from "../entries/model";
import { users } from "../users/model";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

export const email = {
  adminFromAddress:
    "Port Geographic Christmas Cruise Admin <admin@portgeochristmascruise.com.au>",

  async sendTestEmail(ctx: MutationCtx, args: { to: string }) {
    await resend.sendEmail(ctx, {
      from: email.adminFromAddress,
      to: args.to,
      subject: "Test Email",
      html: "<p>This is a test email from the system admin.</p>",
    });
  },

  async sendNewEntryNotificationToCompetitionAdmins(
    ctx: MutationCtx,
    args: { entryId: Id<"entries"> },
  ) {
    const entry = await entries.forEntry(args.entryId).get(ctx.db);
    const admins = await users.listCompetitionAdmins(ctx.db);
    for (const admin of admins) {
      if (!admin.email) continue;
      await this.sendNewEntryNotification(ctx, {
        to: admin.email,
        entry,
      });
    }
  },

  async sendNewEntryNotification(
    ctx: MutationCtx,
    args: { to: string; entry: Doc<"entries"> },
  ) {
    const baseUrl = process.env.SITE_URL;
    const adminUrl = baseUrl ? `${baseUrl}/admin/entries` : "/admin/entries";

    await resend.sendEmail(ctx, {
      from: email.adminFromAddress,
      to: args.to,
      subject: "New Entry Submitted - Awaiting Approval",
      html: `
        <h2>New Entry Submission</h2>
        <p>A new entry has been submitted and is awaiting approval.</p>
        <p><strong>Address:</strong> ${args.entry.houseAddress?.address}</p>
        <p><a href="${adminUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Review Entry</a></p>
        <p>Click the button above or visit the admin panel to approve or reject this entry.</p>
      `,
    });
  },
};
