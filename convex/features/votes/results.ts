import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { entries } from "../entries/model";
import { aggregateVotes, voteNamespace, type VoteTally } from "./lib";

export type RankedEntry = {
  rank: number;
  entryId: Id<"entries">;
  entryNumber: number;
  entryName: string;
  votes: number;
};

// Highest first. Entries on the same count share a rank (1, 2, 2, 4), and
// entries without votes are left off.
export function rankEntries(
  rows: Array<Omit<RankedEntry, "rank">>,
): RankedEntry[] {
  const sorted = rows
    .filter((row) => row.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.entryNumber - b.entryNumber);
  return sorted.map((row) => ({
    ...row,
    rank: sorted.findIndex((other) => other.votes === row.votes) + 1,
  }));
}

// One aggregate count per approved entry and tally, so it stays cheap however
// many votes there are
export async function competitionResults(
  ctx: QueryCtx,
  competitionId: Id<"competitions">,
) {
  const approved = await entries.query(ctx).listApproved(competitionId);
  const tallies: VoteTally[] = [
    "in_person",
    "online",
    "most_jolly",
    "best_display",
  ];
  const counts =
    approved.length === 0
      ? []
      : await aggregateVotes.countBatch(
          ctx,
          tallies.flatMap((tally) =>
            approved.map((entry) => ({
              namespace: voteNamespace(competitionId, tally),
              bounds: { prefix: [entry._id] as [Id<"entries">] },
            })),
          ),
        );
  const countFor = (tally: VoteTally, entryIndex: number) =>
    counts[tallies.indexOf(tally) * approved.length + entryIndex];

  const rankBy = (votesFor: (entryIndex: number) => number) =>
    rankEntries(
      approved.map((entry, index) => ({
        entryId: entry._id,
        entryNumber: entry.state.entryNumber,
        entryName: entry.state.name,
        votes: votesFor(index),
      })),
    );

  return {
    inPersonFavourites: rankBy((i) => countFor("in_person", i)),
    peoplesChoice: rankBy((i) => countFor("online", i)),
    mostJolly: rankBy((i) => countFor("most_jolly", i)),
    // 2025 voted for best display without the in-person check
    legacyBestDisplay: rankBy((i) => countFor("best_display", i)),
  };
}
