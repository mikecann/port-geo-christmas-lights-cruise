import { userSystemAdminMutation } from "./lib";
import { votes } from "../../features/votes/model";
import { aggregateVotes } from "../../features/votes/lib";
import { entries } from "../../features/entries/model";
import type { Id } from "../../_generated/dataModel";

export const wipeAllData = userSystemAdminMutation({
  args: {},

  handler: async (ctx) => {
    // Wipe all votes
    await votes.wipeAll(ctx._db);
    await aggregateVotes.clearAll(ctx);

    // Wipe all entries (this also handles photos)
    await entries.mutate(ctx).wipeAll();

    // Delete all users except system and competition admins
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      const isAdmin =
        user.isSystemAdmin === true || user.isCompetitionAdmin === true;
      if (!isAdmin) await ctx.db.delete(user._id);
    }

    // Delete all stored files
    const storedFiles = await ctx.db.system.query("_storage").collect();
    for (const file of storedFiles)
      await ctx.storage.delete(file._id as Id<"_storage">);
  },
});
