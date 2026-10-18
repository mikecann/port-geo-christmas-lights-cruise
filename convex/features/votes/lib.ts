import { components } from "../../_generated/api";
import type { DataModel, Doc, Id } from "../../_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { isLegacyVote, voteCategoryOf, type VoteCategory } from "./schema";

// One namespace per ranking, so each prize reads one count per entry. From
// 2026 a best display vote is in person (In-Person Favourites) or online
// (People's Choice), never both. Most Jolly votes share 2025's tally, and
// 2025's best display votes keep theirs. Keyed by entry, so each entry's
// count is a prefix count.
export type VoteTally = VoteCategory | "in_person" | "online";

export const aggregateVotes = new TableAggregate<{
  Namespace: string;
  Key: [Id<"entries">];
  DataModel: DataModel;
  TableName: "votes";
}>(components.aggregateVotes, {
  namespace: (doc) => voteNamespace(doc.competitionId, voteTally(doc)),
  sortKey: (doc) => [doc.entryId],
  sumValue: () => 1,
});

export function voteTally(vote: Doc<"votes">): VoteTally {
  const category = voteCategoryOf(vote);
  if (isLegacyVote(vote) || category === "most_jolly") return category;
  return vote.inPerson ? "in_person" : "online";
}

export function voteNamespace(
  competitionId: Id<"competitions">,
  tally: VoteTally,
) {
  return `${competitionId}:${tally}`;
}
