import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usersTable = defineTable({
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
})
  .index("by_email", ["email"])
  .index("by_isCompetitionAdmin", ["isCompetitionAdmin"]);
