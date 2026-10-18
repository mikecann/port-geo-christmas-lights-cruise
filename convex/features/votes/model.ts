import { ConvexError } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "../../_generated/server";
import type { WithoutSystemFields } from "convex/server";
import { isLegacyVote, type CurrentVoteDoc } from "./schema";

export const VOTE_ALREADY_REMOVED_MESSAGE =
  "That vote has already been removed.";

export const OWN_ENTRY_VOTE_MESSAGE =
  "That's your own entry, so you can't vote for it. Thanks for lighting up the canals!";

export const votes = {
  forUser(userId: Id<"users">) {
    const listInCompetition = (
      db: DatabaseReader,
      competitionId: Id<"competitions">,
    ) =>
      db
        .query("votes")
        .withIndex("by_votingUserId_and_competitionId_and_category", (q) =>
          q.eq("votingUserId", userId).eq("competitionId", competitionId),
        )
        .collect();

    return {
      // Their one vote this competition. 2025's per-category votes don't count.
      async find(
        db: DatabaseReader,
        competitionId: Id<"competitions">,
      ): Promise<CurrentVoteDoc | null> {
        const competitionVotes = await listInCompetition(db, competitionId);
        return (
          competitionVotes.find(
            (vote): vote is CurrentVoteDoc => !isLegacyVote(vote),
          ) ?? null
        );
      },

      // Pass the trigger-wrapped db so the counts move with the vote
      async cast(
        db: DatabaseWriter,
        args: Omit<WithoutSystemFields<CurrentVoteDoc>, "votingUserId">,
      ) {
        const vote = { ...args, votingUserId: userId };
        const existing = await this.find(db, args.competitionId);
        if (!existing) return await db.insert("votes", vote);
        await db.replace(existing._id, vote);
        return existing._id;
      },
    };
  },

  forEntry(entryId: Id<"entries">) {
    return {
      // Pass the trigger-wrapped db so the vote aggregate drops them too
      async deleteAll(db: DatabaseWriter) {
        const entryVotes = await db
          .query("votes")
          .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
          .collect();
        for (const vote of entryVotes) await db.delete(vote._id);
      },
    };
  },

  forVote(voteId: Id<"votes">) {
    return {
      async cancel(db: DatabaseWriter, { userId }: { userId: Id<"users"> }) {
        const vote = await db.get(voteId);
        if (!vote) throw new ConvexError(VOTE_ALREADY_REMOVED_MESSAGE);
        if (vote.votingUserId !== userId)
          throw new Error(`User '${userId}' cannot cancel another user's vote`);
        await db.delete(voteId);
      },
    };
  },

  async wipeForCompetition(
    db: DatabaseWriter,
    competitionId: Id<"competitions">,
  ) {
    const allVotes = await db
      .query("votes")
      .withIndex("by_competitionId", (q) =>
        q.eq("competitionId", competitionId),
      )
      .collect();
    let deleted = 0;
    for (const v of allVotes) {
      await db.delete(v._id);
      deleted++;
    }
    return { deleted };
  },
};
