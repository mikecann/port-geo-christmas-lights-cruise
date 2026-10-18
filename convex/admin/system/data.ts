import {
  areDestructiveWipesAllowed,
  ensureDestructiveWipesAllowed,
} from "./lib";
import {
  systemAdminMutation,
  systemAdminQuery,
} from "../../features/common/auth";
import { votes } from "../../features/votes/model";
import { entries } from "../../features/entries/model";
import { photos } from "../../features/photos/model";
import { competitions } from "../../features/competitions/model";
import { v } from "convex/values";

export const wipesAllowed = systemAdminQuery
  .input({})
  .returns(v.boolean())
  .handler(async () => areDestructiveWipesAllowed())
  .public();

// Resets the current competition for testing. Past competitions, the people
// who took part in them and their photos are always kept.
export const wipeAllData = systemAdminMutation
  .input({})
  .returns(v.null())
  .handler(async (context) => {
    ensureDestructiveWipesAllowed();
    const competition = await competitions.query(context).current();

    // Through the trigger-wrapped db so the vote aggregate stays in step
    await votes.wipeForCompetition(context.db, competition._id);

    // This also handles photos
    await entries.mutate(context).wipeCurrentCompetition();

    // Delete non-admin users who have no entries or votes left. This
    // competition's entries are gone, so only earlier ones can remain.
    const allUsers = await context.db.query("users").collect();
    for (const user of allUsers) {
      if (user.isSystemAdmin === true || user.isCompetitionAdmin === true)
        continue;
      const pastEntries = await entries
        .query(context)
        .forUser(competition._id, user._id)
        .listPrevious();
      const pastVote = await context.db
        .query("votes")
        .withIndex("by_votingUserId_and_competitionId_and_category", (q) =>
          q.eq("votingUserId", user._id),
        )
        .first();
      if (pastEntries.length === 0 && pastVote === null)
        await context.db.delete(user._id);
    }

    // Delete stored files that no remaining photo uses
    const storedFiles = await context.db.system.query("_storage").collect();
    for (const file of storedFiles)
      if (!(await photos.isStorageReferenced(context.db, file._id)))
        await context.storage.delete(file._id);
    return null;
  })
  .public();
