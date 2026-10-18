import { components } from "../../_generated/api";
import type { DataModel, Doc, Id } from "../../_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { isLegacyVote, type VoteCategory } from "./schema";

// 2025's votes count per category. From 2026 a vote is either in person or
// online, so In-Person Favourites reads one namespace and People's Choice
// adds the two. Keyed by entry, so each entry's count is a prefix count.
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
  if (isLegacyVote(vote)) return vote.category;
  return vote.inPerson ? "in_person" : "online";
}

export function voteNamespace(
  competitionId: Id<"competitions">,
  tally: VoteTally,
) {
  return `${competitionId}:${tally}`;
}
