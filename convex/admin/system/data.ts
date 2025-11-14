import { userSystemAdminMutation } from "./lib";
import { votes } from "../../features/votes/model";
import { aggregateVotes } from "../../features/votes/lib";
import type { Id } from "../../_generated/dataModel";
import { v } from "convex/values";

export const wipeAllData = userSystemAdminMutation
  .input({})
  .returns(v.null())
  .handler(async ({ context }) => {
    // Wipe all votes
    await votes.wipeAll(context._db);
    await aggregateVotes.clearAll(context);

    // Wipe all entries (this also handles photos)
    await context.services.entryManagement.wipeAll();

    // Delete all users except system and competition admins
    const allUsers = await context.db.query("users").collect();
    for (const user of allUsers) {
      const isAdmin =
        user.isSystemAdmin === true || user.isCompetitionAdmin === true;
      if (!isAdmin) await context.db.delete(user._id);
    }

    // Delete all stored files
    const storedFiles = await context.db.system.query("_storage").collect();
    for (const file of storedFiles)
      await context.storage.delete(file._id as Id<"_storage">);
    return null;
  });
