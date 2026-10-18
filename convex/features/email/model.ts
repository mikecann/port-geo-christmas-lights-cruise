import { components } from "../../_generated/api";
import { Resend } from "@convex-dev/resend";
import type { MutationCtx } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { entries } from "../entries/model";
import { competitions } from "../competitions/model";
import { users } from "../users/model";

// Entry names, addresses and rejection reasons are user or admin written text
export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

export const email = {
  adminFromAddress:
    "Port Geographic Christmas Cruise Admin <admin@portgeochristmascruise.com.au>",

  replyToAddress: "Anna McRostie <AMcRostie@aigleroyal.com.au>",

  // Matches the myEntries route in src/routes.ts
  myEntriesUrl() {
    return `${process.env.SITE_URL ?? ""}/my-entries`;
  },

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
    const entry = await entries.query(ctx).forEntry(args.entryId).get();
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
    await resend.sendEmail(ctx, {
      from: email.adminFromAddress,
      to: args.to,
      subject: "New Entry Submitted - Awaiting Approval",
      html: email.newEntryNotificationHtml(args),
    });
  },

  newEntryNotificationHtml(args: { entry: Doc<"entries"> }) {
    const baseUrl = process.env.SITE_URL;
    const adminUrl = baseUrl ? `${baseUrl}/admin/entries` : "/admin/entries";
    // Returning entrants have their number reserved before approval
    const { entryNumber } = args.entry;

    return `
        <h2>New Entry Submission</h2>
        <p>A new entry has been submitted and is awaiting approval.</p>
        <p><strong>Address:</strong> ${escapeHtml(args.entry.houseAddress?.address)}</p>
        ${entryNumber === undefined ? "" : `<p><strong>Reserved entry number:</strong> ${escapeHtml(entryNumber)}</p>`}
        <p><a href="${escapeHtml(adminUrl)}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Review Entry</a></p>
        <p>Click the button above or visit the admin panel to approve or reject this entry.</p>
      `;
  },

  async sendEntryApprovalEmail(
    ctx: MutationCtx,
    args: { to: string; entry: Doc<"entries">; entryNumber: number },
  ) {
    await resend.sendEmail(ctx, {
      from: email.adminFromAddress,
      replyTo: [email.replyToAddress],
      to: args.to,
      subject: "🎉 Your Christmas Lights Entry Has Been Approved!",
      html: email.approvalHtml({
        ...args,
        competition: await competitions
          .query(ctx)
          .forCompetition(args.entry.competitionId)
          .get(),
      }),
    });
  },

  approvalHtml(args: {
    entry: Doc<"entries">;
    entryNumber: number;
    competition: Doc<"competitions">;
  }) {
    return `
        <h2>Congratulations! Your Entry Has Been Approved</h2>
        <p>We're excited to let you know that your entry for the Port Geographe Christmas Lights Competition has been approved!</p>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Entry Number:</strong> ${escapeHtml(args.entryNumber)}</p>
          <p><strong>Property Name:</strong> ${escapeHtml(args.entry.name)}</p>
          <p><strong>Address:</strong> ${escapeHtml(args.entry.houseAddress?.address)}</p>
        </div>

        <h3>Next Steps:</h3>
        <ol>
          <li><strong>Collect Your Sign:</strong> We'll email you the sign collection details separately.</li>
          <li><strong>Decorate Your Home:</strong> Make sure your Christmas lights display is ready for the cruise dates in December ${escapeHtml(args.competition.year)}.</li>
          <li><strong>Be Visible:</strong> Ensure your lights are switched on during cruise hours (we'll send you the schedule closer to the date).</li>
          <li><strong>Share the Joy:</strong> Tell your friends and neighbours about the event!</li>
          <li><strong>Stay Updated:</strong> Keep an eye on your email for important updates about the cruise schedule.</li>
        </ol>

        <p><a href="${escapeHtml(email.myEntriesUrl())}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Your Entry</a></p>

        <p>Thank you for being part of the Port Geographe Christmas Lights Cruise! Your participation helps create a magical experience for our community.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please don't hesitate to reach out to us.</p>
      `;
  },

  async sendEntryRejectionEmail(
    ctx: MutationCtx,
    args: { to: string; entry: Doc<"entries">; rejectedReason: string },
  ) {
    await resend.sendEmail(ctx, {
      from: email.adminFromAddress,
      to: args.to,
      replyTo: [email.replyToAddress],
      subject: "Update on Your Christmas Lights Entry Application",
      html: email.rejectionHtml(args),
    });
  },

  rejectionHtml(args: { entry: Doc<"entries">; rejectedReason: string }) {
    return `
        <h2>Update on Your Entry Application</h2>
        <p>Thank you for your interest in participating in the Port Geographe Christmas Lights Cruise.</p>
        
        <p>Unfortunately, we are unable to approve your entry at this time.</p>

      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p><strong>Property Name:</strong> ${escapeHtml(args.entry.name)}</p>
          <p><strong>Address:</strong> ${escapeHtml(args.entry.houseAddress?.address)}</p>
          <p style="margin-top: 15px;"><strong>Reason:</strong></p>
          <p style="margin-left: 10px;">${escapeHtml(args.rejectedReason)}</p>
        </div>

        <p>If you believe this was a mistake or if you would like to discuss this decision further, please feel free to contact us. We're happy to provide more information or guidance.</p>

        <p><a href="${escapeHtml(email.myEntriesUrl())}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Your Entries</a></p>

        <p>We appreciate your understanding and hope you'll consider participating in future events.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">For any questions or concerns, please reply to this email</p>
      `;
  },
};
