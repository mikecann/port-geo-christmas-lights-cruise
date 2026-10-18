import { v } from "convex/values";
import { convex } from "../schema";
import { mutation } from "../features/common/lib";
import { ROLES, users } from "../features/users/model";
import { canonicalEmail, normalizeEmail } from "../../shared/auth";

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
// email. Users saved before that may have capitals and no canonical email, so
// run this once on each deployment to fill them in.
export const normalizeEmails = mutation
  .input({})
  .handler(async (context) => {
    let updated = 0;
    for (const user of await context.db.query("users").collect()) {
      if (user.email === undefined) continue;
      const email = normalizeEmail(user.email);
      const canonical = canonicalEmail(email);
      if (email === user.email && canonical === user.canonicalEmail) continue;
      await context.db.patch(user._id, { email, canonicalEmail: canonical });
      updated++;
    }
    return { updated };
  })
  .internal();
