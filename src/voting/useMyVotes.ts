import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { VoteCategory } from "../../convex/features/votes/schema";
import { measured, track } from "../analytics/client";
import { useErrorHandler } from "../common/errors";

// The signed in user's votes this season, with vote and cancel that report
// errors and analytics. status is undefined while loading.
export function useMyVotes() {
  const status = useQuery(api.my.votes.getStatus, {});
  const voteMutation = useMutation(api.my.votes.vote);
  const cancelMutation = useMutation(api.my.votes.cancel);
  const [isVoting, setIsVoting] = useState(false);
  const onApiError = useErrorHandler();

  const vote = (
    entry: { _id: Id<"entries">; competitionId: Id<"competitions"> },
    category: VoteCategory,
  ) => {
    setIsVoting(true);
    void measured(
      () => voteMutation({ entryId: entry._id, category }),
      "vote",
      {
        entry_id: entry._id,
        competition_id: entry.competitionId,
        category,
      },
    )
      .catch(onApiError)
      .finally(() => setIsVoting(false));
  };

  const cancel = (existing: Doc<"votes">) => {
    void cancelMutation({ voteId: existing._id })
      .then(() => {
        track("vote_cancelled", {
          entry_id: existing.entryId,
          competition_id: existing.competitionId,
          category: existing.category,
        });
      })
      .catch(onApiError);
  };

  return { status, isVoting, vote, cancel };
}
