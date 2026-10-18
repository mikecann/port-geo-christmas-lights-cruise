import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { measured, track } from "../analytics/client";
import { useErrorHandler } from "../common/errors";
import { useGeoToken } from "./useGeoToken";
import { pendingVoteAction, pendingVotes } from "./pendingVote";

export type VoteFlowEntry = {
  _id: Id<"entries">;
  competitionId: Id<"competitions">;
  entryNumber: number;
  name: string;
};

export type MyVote = NonNullable<FunctionReturnType<typeof api.my.votes.mine>>;

// What the location check means for the "seen it in person?" question
type InPersonCheck = {
  // null while the location check runs, retries included
  inPersonAllowed: boolean | null;
  // Every try at the location check failed, so they can have another go
  canRetryLocation: boolean;
};

// Each step is one screen of the vote flow, so the look can change without
// touching the rules
export type VoteFlowStep =
  | { step: "loading" }
  | { step: "closed"; year: number }
  // They can answer and tap Vote before signing in; it sends once they're in
  | ({ step: "signedOut" } & InPersonCheck)
  | { step: "ownEntry" }
  | { step: "voted"; vote: MyVote }
  | ({
      step: "choose";
      // Their vote for a different entry, which this one would replace
      otherVote: MyVote | null;
      // Set when they're changing their vote for this entry
      currentVote: MyVote | null;
    } & InPersonCheck);

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
    geo.status === "checking" ? "skip" : { geoToken: geo.token ?? undefined },
  );
  const voteMutation = useMutation(api.my.votes.vote);
  const cancelMutation = useMutation(api.my.votes.cancel);
  const onApiError = useErrorHandler();

  // Their answer to "have you seen it in person?", for this entry only, so
  // moving to another entry starts unanswered again
  const [seen, setSeen] = useState<{
    entryId: Id<"entries">;
    answer: boolean;
  } | null>(null);
  const sawInPerson = seen?.entryId === entry._id ? seen.answer : null;
  const setSawInPerson = (answer: boolean | null) =>
    setSeen(answer === null ? null : { entryId: entry._id, answer });
  const [isChanging, setIsChanging] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isConfirmingSwitch, setIsConfirmingSwitch] = useState(false);

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

  const inPersonCheck: InPersonCheck = {
    inPersonAllowed:
      geo.status === "checking" || !check ? null : check.locationCheck === "ok",
    canRetryLocation: geo.status === "failed",
  };
  const { inPersonAllowed } = inPersonCheck;

  const state = ((): VoteFlowStep => {
    if (competition === undefined || isAuthLoading) return { step: "loading" };
    if (!competition.votingOpen || competition._id !== entry.competitionId)
      return { step: "closed", year: competition.year };
    if (!isAuthenticated) return { step: "signedOut", ...inPersonCheck };
    if (mine === undefined) return { step: "loading" };
    if (mine.isOwnEntry) return { step: "ownEntry" };

    const vote = mine.vote;
    const isForThisEntry = vote?.entry._id === entry._id;
    if (vote && isForThisEntry && !isChanging) return { step: "voted", vote };
    return {
      step: "choose",
      otherVote: vote && !isForThisEntry ? vote : null,
      currentVote: isForThisEntry ? vote : null,
      ...inPersonCheck,
    };
  })();

  // Set straight away, unlike isBusy, so a second tap in the same moment
  // can't send it again
  const isSending = useRef(false);
  const send = (answer: boolean | null) => {
    if (isSending.current) return;
    isSending.current = true;
    setIsBusy(true);
    void measured(
      async () =>
        await voteMutation({
          entryId: entry._id,
          // Only asked once the location check passes. Otherwise it can't be
          // in person, so it goes as "not seen".
          sawInPerson: inPersonAllowed ? (answer ?? undefined) : false,
          geoToken: (await geo.forVote()) ?? undefined,
        }),
      "vote",
      analytics,
    )
      .then(() => {
        setIsChanging(false);
        setIsConfirmingSwitch(false);
      })
      .catch(onApiError)
      .finally(() => {
        isSending.current = false;
        setIsBusy(false);
      });
  };

  // A vote tapped before signing in, picked up once they're in and the
  // location check has settled. Taking it forgets it, so it only sends once.
  const resumePendingVote = useEffectEvent(() => {
    const pending = pendingVotes.peek(entry._id);
    if (!pending) return;
    const action = pendingVoteAction(state, pending, isSigningIn);
    if (action === "wait") return;
    if (action === "reopen") {
      pendingVotes.setAtGoogle(false);
      setSawInPerson(pending.sawInPerson);
      setIsSigningIn(true);
      return;
    }
    if (!pendingVotes.take(entry._id)) return;
    setIsSigningIn(false);
    if (action === "drop" || action === "ask") return;
    setSawInPerson(pending.sawInPerson);
    if (action === "confirmSwitch") setIsConfirmingSwitch(true);
    else send(pending.sawInPerson);
  });
  useLayoutEffect(() => {
    // Signing in and the location check both finish outside React, so this
    // is the first chance to act on the stored vote. Before paint, so Vote
    // is never tappable while it's about to send itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resumePendingVote();
  }, [isAuthenticated, state.step, inPersonAllowed]);

  // Leaving with the sheet open (the header, the logo, "Photos & map")
  // doesn't close it, so forget the vote here too
  const isSheetOpen = isSigningIn && state.step === "signedOut";
  const wasSheetOpen = useRef(false);
  useEffect(() => {
    wasSheetOpen.current = isSheetOpen;
  });
  useEffect(
    () => () => {
      if (wasSheetOpen.current) pendingVotes.abandon();
    },
    [],
  );
  useEffect(() => {
    // Back from Google with the back button and the page kept as it was
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) pendingVotes.setAtGoogle(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
    // The Vote button: sign in first, or check before moving their vote
    vote: () => {
      if (state.step === "signedOut") {
        pendingVotes.save(entry._id, sawInPerson);
        setIsSigningIn(true);
        return;
      }
      // Tapped themselves, so a stored one mustn't follow it
      pendingVotes.take(entry._id);
      if (state.step === "choose" && state.otherVote) {
        setIsConfirmingSwitch(true);
        return;
      }
      send(sawInPerson);
    },
    isSigningIn: isSheetOpen,
    leaveForGoogle: () => pendingVotes.setAtGoogle(true),
    cancelSignIn: () => {
      pendingVotes.clear();
      setIsSigningIn(false);
    },
    isConfirmingSwitch:
      isConfirmingSwitch && state.step === "choose" && !!state.otherVote,
    confirmSwitch: () => send(sawInPerson),
    cancelSwitch: () => setIsConfirmingSwitch(false),
    remove,
    retryLocation: geo.retry,
    startChanging: () => {
      setSeen(null);
      setIsChanging(true);
    },
    stopChanging: () => setIsChanging(false),
  };
}
