import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "../../_generated/server";
import type { WithoutSystemFields } from "convex/server";
import { isLegacyVote, type CurrentVoteDoc } from "./schema";
import { canonicalEmail } from "../../../shared/auth";

export const VOTE_ALREADY_REMOVED_MESSAGE =
  "That vote has already been removed.";

export const OWN_ENTRY_VOTE_MESSAGE =
  "That's your own entry, so you can't vote for it. Thanks for lighting up the canals!";

export const SAME_INBOX_VOTE_MESSAGE =
  "You've already voted this year from another account with the same email address. Each person gets one vote, so sign in with that account if you'd like to change it.";

// Saved at sign-in, and worked out here for anyone the backfill missed
const canonicalEmailOf = (user: Doc<"users"> | null) =>
  user?.canonicalEmail ??
  (user?.email === undefined ? undefined : canonicalEmail(user.email));

const isSameInbox = (a: Doc<"users"> | null, b: Doc<"users"> | null) => {
  const email = canonicalEmailOf(a);
  return email !== undefined && email === canonicalEmailOf(b);
};

// Counts entries made from another account with the same inbox too
export const isOwnEntry = async (
  db: DatabaseReader,
  userId: Id<"users">,
  entry: Doc<"entries">,
) => {
  if (entry.submittedByUserId === userId) return true;
  const [voter, entrant] = await Promise.all([
    db.get(userId),
    db.get(entry.submittedByUserId),
  ]);
  return isSameInbox(voter, entrant);
};

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
        args: Omit<
          WithoutSystemFields<CurrentVoteDoc>,
          "votingUserId" | "voterCanonicalEmail"
        >,
      ) {
        const email = canonicalEmailOf(await db.get(userId));
        const vote = {
          ...args,
          votingUserId: userId,
          ...(email === undefined ? {} : { voterCanonicalEmail: email }),
        };
        const existing = await this.find(db, args.competitionId);
        if (!existing) return await db.insert("votes", vote);
        await db.replace(existing._id, vote);
        return existing._id;
      },

      // One person can have an account for each spelling of their email (see
      // canonicalEmail), so a vote from any of the others counts as theirs.
      // Each account has one vote at most, so this only reads a few rows.
      async findFromSameInbox(
        db: DatabaseReader,
        competitionId: Id<"competitions">,
      ) {
        const email = canonicalEmailOf(await db.get(userId));
        if (email === undefined) return null;
        const inboxVotes = await db
          .query("votes")
          .withIndex("by_competitionId_and_voterCanonicalEmail", (q) =>
            q
              .eq("competitionId", competitionId)
              .eq("voterCanonicalEmail", email),
          )
          .collect();
        return inboxVotes.find((vote) => vote.votingUserId !== userId) ?? null;
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
