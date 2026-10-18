import { components } from "../../_generated/api";
import type { DataModel, Doc, Id } from "../../_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";

export const aggregateVotes = new TableAggregate<{
  Namespace: string;
  Key: [Id<"entries">];
  DataModel: DataModel;
  TableName: "votes";
}>(components.aggregateVotes, {
  namespace: (doc) => voteNamespace(doc.competitionId, doc.category),
  sortKey: (doc) => [doc.entryId],
  sumValue: () => 1,
});

export function voteNamespace(
  competitionId: Id<"competitions">,
  category: Doc<"votes">["category"],
) {
  return `${competitionId}:${category}`;
}
