import type { DatabaseReader } from "../../_generated/server";

export const users = {
  listCompetitionAdmins: async (db: DatabaseReader) => {
    return await db
      .query("users")
      .withIndex("by_isCompetitionAdmin", (q) =>
        q.eq("isCompetitionAdmin", true),
      )
      .collect();
  },
};
