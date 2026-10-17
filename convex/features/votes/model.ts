import type { Id } from "../../_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "../../_generated/server";
import type { VoteCategory } from "./schema";

export const votes = {
  forUser(userId: Id<"users">) {
    return {
      async list(db: DatabaseReader) {
        return await db
          .query("votes")
          .withIndex("by_votingUserId_and_competitionId_and_category", (q) =>
            q.eq("votingUserId", userId),
          )
          .collect();
      },

      async hasVotedForCategory(
        db: DatabaseReader,
        competitionId: Id<"competitions">,
        category: VoteCategory,
      ) {
        const existing = await db
          .query("votes")
          .withIndex("by_votingUserId_and_competitionId_and_category", (q) =>
            q
              .eq("votingUserId", userId)
              .eq("competitionId", competitionId)
              .eq("category", category),
          )
          .first();
        return existing !== null;
      },

      async findVoteForCategory(
        db: DatabaseReader,
        competitionId: Id<"competitions">,
        category: VoteCategory,
      ) {
        return await db
          .query("votes")
          .withIndex("by_votingUserId_and_competitionId_and_category", (q) =>
            q
              .eq("votingUserId", userId)
              .eq("competitionId", competitionId)
              .eq("category", category),
          )
          .first();
      },

      async voteForEntry(
        db: DatabaseWriter,
        args: {
          competitionId: Id<"competitions">;
          entryId: Id<"entries">;
          category: VoteCategory;
        },
      ) {
        const existing = await this.findVoteForCategory(
          db,
          args.competitionId,
          args.category,
        );

        if (existing)
          throw new Error(
            `User '${userId}' has already voted in category '${args.category}' and cannot vote again`,
          );

        return await db.insert("votes", {
          competitionId: args.competitionId,
          entryId: args.entryId,
          votingUserId: userId,
          category: args.category,
        });
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
        if (!vote) throw new Error(`Vote '${voteId}' not found`);
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
