import type { Doc } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";

export const ROLES = ["competitionAdmin", "systemAdmin"] as const;
export type Role = (typeof ROLES)[number];

export const users = {
  listCompetitionAdmins: async (db: DatabaseReader) => {
    return await db
      .query("users")
      .withIndex("by_isCompetitionAdmin", (q) =>
        q.eq("isCompetitionAdmin", true),
      )
      .collect();
  },

  // System admins can do everything a competition admin can
  hasRole(user: Doc<"users">, role: Role) {
    if (user.isSystemAdmin === true) return true;
    return role === "competitionAdmin" && user.isCompetitionAdmin === true;
  },
};
