import { v } from "convex/values";
import { convex } from "../schema";
import { mutation } from "../features/common/lib";
import { ROLES, users } from "../features/users/model";
import { canonicalEmail, normalizeEmail } from "../../shared/auth";
import { isLegacyVote } from "../features/votes/schema";
import type { Id } from "../_generated/dataModel";

export const hasRole = convex
  .query()
  .input({
    userId: v.id("users"),
    role: v.union(...ROLES.map((role) => v.literal(role))),
  })
  .returns(v.boolean())
  .handler(async (context, input) => {
    const user = await context.db.get(input.userId);
    return user !== null && users.hasRole(user, input.role);
  })
  .internal();

// Sign-in matches emails in lower case, and voting checks the canonical
// email. Users saved before that may have capitals and no canonical email, and
// this year's votes from before then don't have the voter's canonical email,
// so run this once on each deployment to fill them in.
export const normalizeEmails = mutation
  .input({})
  .handler(async (context) => {
    let updated = 0;
    const canonicalByUser = new Map<Id<"users">, string>();
    for (const user of await context.db.query("users").collect()) {
      if (user.email === undefined) continue;
      const email = normalizeEmail(user.email);
      const canonical = canonicalEmail(email);
      // Mock voters stay out of the one-vote-per-inbox check
      if (user.isTestUser !== true) canonicalByUser.set(user._id, canonical);
      if (email === user.email && canonical === user.canonicalEmail) continue;
      await context.db.patch(user._id, { email, canonicalEmail: canonical });
      updated++;
    }

    let votesUpdated = 0;
    for (const vote of await context.db.query("votes").collect()) {
      // 2025's per-category votes were never one per inbox
      if (isLegacyVote(vote)) continue;
      const canonical = canonicalByUser.get(vote.votingUserId);
      if (canonical === undefined || canonical === vote.voterCanonicalEmail)
        continue;
      await context.db.patch(vote._id, { voterCanonicalEmail: canonical });
      votesUpdated++;
    }
    return { updated, votesUpdated };
  })
  .internal();
