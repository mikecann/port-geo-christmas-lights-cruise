import { ConvexError } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";
import { MAX_USER_NAME_LENGTH } from "../../../shared/constants";

export const ROLES = ["competitionAdmin", "systemAdmin"] as const;
export type Role = (typeof ROLES)[number];

export function cleanUserName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ConvexError("Please enter your name.");
  if (trimmed.length > MAX_USER_NAME_LENGTH)
    throw new ConvexError(
      `Name must be ${MAX_USER_NAME_LENGTH} characters or fewer.`,
    );
  return trimmed;
}

export const users = {
  listCompetitionAdmins: async (db: DatabaseReader) => {
    return await db
      .query("users")
      .withIndex("by_isCompetitionAdmin", (q) =>
        q.eq("isCompetitionAdmin", true),
      )
      .collect();
  },

  // Competition admins and system admins, each once
  listAdmins: async (db: DatabaseReader) => {
    const systemAdmins = await db
      .query("users")
      .withIndex("by_isSystemAdmin", (q) => q.eq("isSystemAdmin", true))
      .collect();
    const admins = new Map(
      [...(await users.listCompetitionAdmins(db)), ...systemAdmins].map(
        (user) => [user._id, user],
      ),
    );
    return [...admins.values()];
  },

  // Matches on name or email, so either finds them
  search: async (db: DatabaseReader, text: string, limit = 20) => {
    const [byName, byEmail] = await Promise.all([
      db
        .query("users")
        .withSearchIndex("search_name", (q) => q.search("name", text))
        .take(limit),
      db
        .query("users")
        .withSearchIndex("search_email", (q) => q.search("email", text))
        .take(limit),
    ]);
    const found = new Map(
      [...byEmail, ...byName].map((user) => [user._id, user]),
    );
    return [...found.values()].slice(0, limit);
  },

  // System admins can do everything a competition admin can
  hasRole(user: Doc<"users">, role: Role) {
    if (user.isSystemAdmin === true) return true;
    return role === "competitionAdmin" && user.isCompetitionAdmin === true;
  },
};
