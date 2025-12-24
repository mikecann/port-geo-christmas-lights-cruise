import { v } from "convex/values";
import { convex } from "../schema";

export const listAll = convex
  .query()
  .internal()
  .input({})
  .returns(
    v.array(
      v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.number()),
        phone: v.optional(v.string()),
        phoneVerificationTime: v.optional(v.number()),
        isAnonymous: v.optional(v.boolean()),
        isSystemAdmin: v.optional(v.boolean()),
        isCompetitionAdmin: v.optional(v.boolean()),
        isTestUser: v.optional(v.boolean()),
      }),
    ),
  )
  .handler(async ({ context }) => {
    return await context.db.query("users").collect();
  });
