import { v } from "convex/values";
import { convex } from "../schema";
import { mutation } from "../features/common/lib";
import { ROLES, users } from "../features/users/model";
import { normalizeEmail } from "../../shared/auth";

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

// Sign-in matches emails in lower case. Users saved before that may have
// capitals, so run this once on each deployment to lower-case them.
export const normalizeEmails = mutation
  .input({})
  .handler(async (context) => {
    let updated = 0;
    for (const user of await context.db.query("users").collect()) {
      if (user.email === undefined) continue;
      const email = normalizeEmail(user.email);
      if (email === user.email) continue;
      await context.db.patch(user._id, { email });
      updated++;
    }
    return { updated };
  })
  .internal();
