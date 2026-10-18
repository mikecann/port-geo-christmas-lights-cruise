import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DEFAULT_IN_PERSON_AREA } from "../../shared/constants";
import { peoplesChoiceOnlyReason } from "../../shared/voting";
import { measured, track } from "../analytics/client";
import { useErrorHandler } from "../common/errors";
import { useGeoToken } from "./useGeoToken";

export type VoteFlowEntry = {
  _id: Id<"entries">;
  competitionId: Id<"competitions">;
  entryNumber: number;
  name: string;
};

export type MyVote = NonNullable<FunctionReturnType<typeof api.my.votes.mine>>;

// Each step is one screen of the vote flow, so the look can change without
// touching the rules
export type VoteFlowStep =
  | { step: "loading" }
  | { step: "closed"; year: number }
  | { step: "signedOut" }
  | { step: "ownEntry" }
  | { step: "voted"; vote: MyVote; reason: string | null }
  | {
      step: "choose";
      // Their vote for a different entry, which this one would replace
      otherVote: MyVote | null;
      // Set when they're changing their vote for this entry
      currentVote: MyVote | null;
      // null while the location check runs
      inPersonAllowed: boolean | null;
      // Why it can only count for People's Choice, when it can't be in person
      reason: string | null;
    };

export function useVoteFlow(entry: VoteFlowEntry) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const competition = useQuery(api.public.competitions.current, {});
  const mine = useQuery(
    api.my.votes.getForEntry,
    isAuthenticated ? { entryId: entry._id } : "skip",
  );
  const geo = useGeoToken();
  const check = useQuery(
    api.public.votes.inPersonCheck,
    geo.token === undefined ? "skip" : { geoToken: geo.token ?? undefined },
  );
  const voteMutation = useMutation(api.my.votes.vote);
  const cancelMutation = useMutation(api.my.votes.cancel);
  const onApiError = useErrorHandler();

  const [sawInPerson, setSawInPerson] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const analytics = {
    entry_id: entry._id,
    competition_id: entry.competitionId,
  };

  const observed = useRef("");
  useEffect(() => {
    if (isAuthLoading || !competition?.votingOpen) return;
    const state = `${entry._id}:${isAuthenticated}`;
    if (observed.current === state) return;
    observed.current = state;
    track(isAuthenticated ? "vote_opened" : "vote_auth_required", {
      entry_id: entry._id,
      competition_id: entry.competitionId,
    });
  }, [isAuthLoading, isAuthenticated, competition, entry]);

  const area = check?.area ?? DEFAULT_IN_PERSON_AREA;
  const inPersonAllowed = check ? check.locationCheck === "ok" : null;

  const state = ((): VoteFlowStep => {
    if (competition === undefined || isAuthLoading) return { step: "loading" };
    if (!competition.votingOpen || competition._id !== entry.competitionId)
      return { step: "closed", year: competition.year };
    if (!isAuthenticated) return { step: "signedOut" };
    if (mine === undefined) return { step: "loading" };
    if (mine.isOwnEntry) return { step: "ownEntry" };

    const vote = mine.vote;
    const isForThisEntry = vote?.entry._id === entry._id;
    if (vote && isForThisEntry && !isChanging)
      return {
        step: "voted",
        vote,
        reason:
          peoplesChoiceOnlyReason(vote.locationCheck, area) ??
          (vote.inPerson
            ? null
            : "You didn't tick that you've seen it in person, so it counts for People's Choice only."),
      };
    return {
      step: "choose",
      otherVote: vote && !isForThisEntry ? vote : null,
      currentVote: isForThisEntry ? vote : null,
      inPersonAllowed,
      reason: check ? peoplesChoiceOnlyReason(check.locationCheck, area) : null,
    };
  })();

  const vote = () => {
    setIsBusy(true);
    void measured(
      async () =>
        await voteMutation({
          entryId: entry._id,
          sawInPerson: inPersonAllowed === true && sawInPerson,
          geoToken: (await geo.fresh()) ?? undefined,
        }),
      "vote",
      analytics,
    )
      .then(() => setIsChanging(false))
      .catch(onApiError)
      .finally(() => setIsBusy(false));
  };

  const remove = (myVote: MyVote) => {
    setIsBusy(true);
    void cancelMutation({ voteId: myVote._id })
      .then(() => {
        setIsChanging(false);
        track("vote_cancelled", analytics);
      })
      .catch(onApiError)
      .finally(() => setIsBusy(false));
  };

  return {
    state,
    sawInPerson,
    setSawInPerson,
    isBusy,
    vote,
    remove,
    startChanging: () => setIsChanging(true),
    stopChanging: () => setIsChanging(false),
  };
}
