import { components } from "../../_generated/api";
import type { DataModel, Doc, Id } from "../../_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { Triggers } from "convex-helpers/server/triggers";

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

export const triggers = new Triggers<DataModel>();
triggers.register("votes", aggregateVotes.trigger());

export function voteNamespace(
  competitionId: Id<"competitions">,
  category: Doc<"votes">["category"],
) {
  return `${competitionId}:${category}`;
}
