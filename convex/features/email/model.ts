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

  replyToAddress: "Anna McRostie <AMcRostie@aigleroyal.com.au>",

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

  async sendEntryApprovalEmail(
    ctx: MutationCtx,
    args: { to: string; entry: Doc<"entries">; entryNumber: number },
  ) {
    const baseUrl = process.env.SITE_URL;
    const myEntriesUrl = baseUrl ? `${baseUrl}/my/entries` : "/my/entries";

    await resend.sendEmail(ctx, {
      from: email.adminFromAddress,
      replyTo: [email.replyToAddress],
      to: args.to,
      subject: "🎉 Your Christmas Lights Entry Has Been Approved!",
      html: `
        <h2>Congratulations! Your Entry Has Been Approved</h2>
        <p>We're excited to let you know that your entry for the Port Geographe Christmas Lights Competition has been approved!</p>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Entry Number:</strong> ${args.entryNumber}</p>
          <p><strong>Property Name:</strong> ${args.entry.name}</p>
          <p><strong>Address:</strong> ${args.entry.houseAddress?.address}</p>
        </div>

        <h3>Next Steps:</h3>
        <ol>
          <li><strong>Decorate Your Home:</strong> Make sure your Christmas lights display is ready for the cruise dates in December 2025.</li>
          <li><strong>Be Visible:</strong> Ensure your lights are switched on during cruise hours (we'll send you the schedule closer to the date).</li>
          <li><strong>Share the Joy:</strong> Tell your friends and neighbors about the event!</li>
          <li><strong>Stay Updated:</strong> Keep an eye on your email for important updates about the cruise schedule.</li>
        </ol>

        <p><a href="${myEntriesUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Your Entry</a></p>

        <p>Thank you for being part of the Port Geographe Christmas Lights Cruise! Your participation helps create a magical experience for our community.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please don't hesitate to reach out to us.</p>
      `,
    });
  },

  async sendEntryRejectionEmail(
    ctx: MutationCtx,
    args: { to: string; entry: Doc<"entries">; rejectedReason: string },
  ) {
    const baseUrl = process.env.SITE_URL;
    const myEntriesUrl = baseUrl ? `${baseUrl}/my/entries` : "/my/entries";

    await resend.sendEmail(ctx, {
      from: email.adminFromAddress,
      to: args.to,
      replyTo: [email.replyToAddress],
      subject: "Update on Your Christmas Lights Entry Application",
      html: `
        <h2>Update on Your Entry Application</h2>
        <p>Thank you for your interest in participating in the Port Geographe Christmas Lights Cruise.</p>
        
        <p>Unfortunately, we are unable to approve your entry at this time.</p>

      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p><strong>Property Name:</strong> ${args.entry.name}</p>
          <p><strong>Address:</strong> ${args.entry.houseAddress?.address}</p>
          <p style="margin-top: 15px;"><strong>Reason:</strong></p>
          <p style="margin-left: 10px;">${args.rejectedReason}</p>
        </div>

        <p>If you believe this was a mistake or if you would like to discuss this decision further, please feel free to contact us. We're happy to provide more information or guidance.</p>

        <p><a href="${myEntriesUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Your Entries</a></p>

        <p>We appreciate your understanding and hope you'll consider participating in future events.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">For any questions or concerns, please reply to this email</p>
      `,
    });
  },
};
