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
import {
  VOTE_CATEGORIES,
  type VoteCategory,
} from "../../convex/features/votes/schema";
import { useGeoToken } from "./useGeoToken";
import { pendingVoteAction, pendingVotes } from "./pendingVote";

export type VoteFlowEntry = {
  _id: Id<"entries">;
  competitionId: Id<"competitions">;
  entryNumber: number;
  name: string;
};

// Their vote in each category, null where they haven't voted
export type MyVotes = FunctionReturnType<typeof api.my.votes.mine>;
export type MyVote = NonNullable<MyVotes[VoteCategory]>;

// Their votes that are for this entry, best display first
export const votesOn = (votes: MyVotes, entryId: Id<"entries">) =>
  VOTE_CATEGORIES.flatMap((category) => {
    const vote = votes[category];
    return vote?.entry._id === entryId ? [vote] : [];
  });

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
  // At least one of their votes is for this entry
  | ({ step: "voted"; votes: MyVotes } & InPersonCheck)
  // Votes for other entries would move here, and ones for this entry are
  // being changed
  | ({ step: "choose"; votes: MyVotes } & InPersonCheck);

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
  // What's being sent: a vote in one category, or removing their votes here
  const [busy, setBusy] = useState<VoteCategory | "remove" | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  // The category whose vote for another entry they'd move here
  const [switching, setSwitching] = useState<VoteCategory | null>(null);

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

    const { votes } = mine;
    if (votesOn(votes, entry._id).length > 0 && !isChanging)
      return { step: "voted", votes, ...inPersonCheck };
    return { step: "choose", votes, ...inPersonCheck };
  })();

  // Set straight away, unlike isBusy, so a second tap in the same moment
  // can't send it again
  const isSending = useRef(false);
  const send = (category: VoteCategory, answer: boolean | null) => {
    if (isSending.current) return;
    isSending.current = true;
    setBusy(category);
    void measured(
      async () =>
        await voteMutation({
          entryId: entry._id,
          category,
          // Only asked once the location check passes. Otherwise it can't be
          // in person, so it goes as "not seen".
          sawInPerson: inPersonAllowed ? (answer ?? undefined) : false,
          geoToken: (await geo.forVote()) ?? undefined,
        }),
      "vote",
      { ...analytics, category },
    )
      .then(() => {
        setIsChanging(false);
        setSwitching(null);
      })
      .catch(onApiError)
      .finally(() => {
        isSending.current = false;
        setBusy(null);
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
    if (action === "send") send(pending.category, pending.sawInPerson);
    else {
      // The sheet shows over the vote buttons, not the receipt
      setIsChanging(true);
      setSwitching(pending.category);
    }
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

  // Their votes for this entry, in every category
  const removeHere = () => {
    if (state.step !== "choose") return;
    const here = votesOn(state.votes, entry._id);
    setBusy("remove");
    void Promise.all(here.map((vote) => cancelMutation({ voteId: vote._id })))
      .then(() => {
        setIsChanging(false);
        for (const vote of here)
          track("vote_cancelled", { ...analytics, category: vote.category });
      })
      .catch(onApiError)
      .finally(() => setBusy(null));
  };

  return {
    state,
    sawInPerson,
    setSawInPerson,
    busy,
    // A vote button: sign in first, or check before moving their vote
    vote: (category: VoteCategory) => {
      if (state.step === "signedOut") {
        pendingVotes.save(entry._id, category, sawInPerson);
        setIsSigningIn(true);
        return;
      }
      // Tapped themselves, so a stored one mustn't follow it
      pendingVotes.take(entry._id);
      const existing = state.step === "choose" ? state.votes[category] : null;
      if (existing && existing.entry._id !== entry._id) {
        setSwitching(category);
        return;
      }
      send(category, sawInPerson);
    },
    isSigningIn: isSheetOpen,
    leaveForGoogle: () => pendingVotes.setAtGoogle(true),
    cancelSignIn: () => {
      pendingVotes.clear();
      setIsSigningIn(false);
    },
    // The category whose vote they're moving here, while the sheet asks
    switching: state.step === "choose" ? switching : null,
    confirmSwitch: () => {
      if (switching) send(switching, sawInPerson);
    },
    cancelSwitch: () => setSwitching(null),
    removeHere,
    retryLocation: geo.retry,
    startChanging: () => {
      setSeen(null);
      setIsChanging(true);
    },
    stopChanging: () => setIsChanging(false),
  };
}
