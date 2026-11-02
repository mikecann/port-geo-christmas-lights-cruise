import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { measured, track } from "../analytics/client";
import { useErrorHandler } from "../common/errors";
import {
  LOCATION_RETRY_MESSAGE,
  peoplesChoiceOnlyReason,
  votingPhase,
  type VotingPhase,
} from "../../shared/voting";
import {
  VOTE_CATEGORIES,
  type VoteCategory,
} from "../../convex/features/votes/schema";
import { useGeoToken } from "./useGeoToken";
import { pendingVoteAction, pendingVotes } from "./pendingVote";
import {
  seenAnswerFromVotes,
  voteButtonStatus,
  voteToSend,
} from "./voteButtons";
import { showVoteNotSentToast, showVoteToast } from "./voteToast";
import { VOTE_LIGHTS_MS } from "./bulbs";
import { playVoteSound, readyVoteSound } from "./voteSound";
import { tapHaptic, voteBuzz } from "./voteHaptics";

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

// The vote that's just gone in, while its button lights up. When, so a
// second vote straight after lights up afresh.
export type JustVoted = { category: VoteCategory; at: number };

// What the location check means for the "seen it in person?" question
type InPersonCheck = {
  // null while the location check runs, retries included
  inPersonAllowed: boolean | null;
  // Every try at the location check failed, so they can have another go
  canRetryLocation: boolean;
  // Why it can only count for People's Choice, null once the check passes
  peoplesChoiceReason: string | null;
};

// The vote couldn't get a fresh location token, even after retrying
class LocationUnconfirmed extends Error {}

// Both ends say "try again" when an in-person vote can't be confirmed: here
// when no token could be fetched, and the server when the token was stale
const isLocationRetry = (error: unknown) =>
  error instanceof LocationUnconfirmed ||
  (error instanceof ConvexError && error.data === LOCATION_RETRY_MESSAGE);

// Each step is one screen of the vote flow, so the look can change without
// touching the rules
export type VoteFlowStep =
  | { step: "loading" }
  | { step: "closed"; phase: Exclude<VotingPhase, "open">; year: number }
  // They can answer and tap Vote before signing in; it sends once they're in
  | ({ step: "signedOut" } & InPersonCheck)
  | { step: "ownEntry" }
  // Signed in, with their votes in each category, on this entry or another
  | ({ step: "choose"; votes: MyVotes } & InPersonCheck);

export function useVoteFlow(
  entry: VoteFlowEntry,
  // Start on "I've seen it" (they scanned the sign at the house). It's only a
  // starting answer: it only counts as in person if the location check
  // passes too, and they can switch it.
  { presumeSeen = false }: { presumeSeen?: boolean } = {},
) {
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
    answer: boolean | null;
  } | null>(null);
  const setSawInPerson = (answer: boolean | null) => {
    setSeen({ entryId: entry._id, answer });
    setNudge(null);
    setLocationFailed(null);
  };
  // The category being sent, voted or removed
  const [busy, setBusy] = useState<VoteCategory | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  // The category whose vote for another entry they'd move here
  const [switching, setSwitching] = useState<VoteCategory | null>(null);
  // The category whose vote here they've tapped, while it asks to remove it
  const [removing, setRemoving] = useState<VoteCategory | null>(null);
  const [justVoted, setJustVoted] = useState<JustVoted | null>(null);
  // The category whose vote couldn't confirm their location, so the buttons
  // stay as they were and they choose what happens next
  const [locationFailed, setLocationFailed] = useState<{
    entryId: Id<"entries">;
    category: VoteCategory;
  } | null>(null);
  // When they last tapped Vote before answering the seen-it question, so the
  // switch can point itself out
  const [nudge, setNudge] = useState<{
    entryId: Id<"entries">;
    at: number;
  } | null>(null);
  useEffect(() => {
    if (!justVoted) return;
    const timer = setTimeout(() => setJustVoted(null), VOTE_LIGHTS_MS);
    return () => clearTimeout(timer);
  }, [justVoted]);

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
    peoplesChoiceReason:
      geo.status === "checking" || !check
        ? null
        : peoplesChoiceOnlyReason(check.locationCheck, check.area),
  };
  const { inPersonAllowed } = inPersonCheck;

  const state = ((): VoteFlowStep => {
    if (competition === undefined || isAuthLoading) return { step: "loading" };
    if (competition._id !== entry.competitionId)
      return { step: "closed", phase: "finished", year: competition.year };
    const phase = votingPhase(competition);
    if (phase !== "open")
      return { step: "closed", phase, year: competition.year };
    if (!isAuthenticated) return { step: "signedOut", ...inPersonCheck };
    if (mine === undefined) return { step: "loading" };
    if (mine.isOwnEntry) return { step: "ownEntry" };

    return { step: "choose", votes: mine.votes, ...inPersonCheck };
  })();
  const votes = state.step === "choose" ? state.votes : null;
  // Until they answer on this page, what their votes here were sent with
  const sawInPerson =
    seen?.entryId === entry._id
      ? seen.answer
      : (seenAnswerFromVotes(votes, entry._id) ??
        // Only once the location check passes: before that the question isn't
        // shown, and a vote held over sign-in mustn't carry an answer they
        // never gave
        (presumeSeen && inPersonAllowed === true ? true : null));
  // The vote button waits for this, so nobody is counted as "not seen" by
  // missing the question
  const needsSeenAnswer = inPersonAllowed === true && sawInPerson === null;

  // In the tap, as that's the only time the sound can be got ready and an
  // iPhone will give its little tap
  const tapToSend = (category: VoteCategory, peoplesChoice = false) => {
    readyVoteSound();
    tapHaptic();
    send(category, sawInPerson, peoplesChoice);
  };

  // Set straight away, unlike isBusy, so a second tap in the same moment
  // can't send it again
  const isSending = useRef(false);
  // peoplesChoice: they chose it after their location couldn't be confirmed,
  // so it goes as "not seen" without waiting on another token
  const send = (
    category: VoteCategory,
    answer: boolean | null,
    peoplesChoice = false,
  ) => {
    if (isSending.current) return;
    isSending.current = true;
    setBusy(category);
    setLocationFailed(null);
    void measured(
      async () => {
        // Only an in-person vote needs a location token, and fetching one can
        // retry for a while on a bad connection. The rest still send one if
        // it comes straight away, so admins can see where they came from.
        const needsToken =
          !peoplesChoice && inPersonAllowed === true && answer === true;
        const token = needsToken ? await geo.forVote() : await geo.ifQuick();
        const args = peoplesChoice
          ? { sawInPerson: false, geoToken: token ?? undefined }
          : voteToSend(answer, inPersonAllowed, token);
        // The page's location check is left as it was, so the in-person
        // buttons and their answer stay put for another go
        if (!args) throw new LocationUnconfirmed();
        return await voteMutation({ entryId: entry._id, category, ...args });
      },
      "vote",
      { ...analytics, category },
    )
      .then(() => {
        setSwitching(null);
        setJustVoted({ category, at: Date.now() });
        playVoteSound(category);
        voteBuzz();
        showVoteToast(category, "sent");
      })
      .catch((error: unknown) => {
        if (isLocationRetry(error)) {
          setSwitching(null);
          setLocationFailed({ entryId: entry._id, category });
        } else onApiError(error);
      })
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
    if (action === "notInPerson") {
      // Kept, so it's there if checking their location again works
      setSawInPerson(pending.sawInPerson);
      showVoteNotSentToast(pending.category);
      return;
    }
    if (action === "drop" || action === "ask") return;
    setSawInPerson(pending.sawInPerson);
    if (action === "send") send(pending.category, pending.sawInPerson);
    else setSwitching(pending.category);
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

  // Their vote in this category, once they've said yes to removing it
  const remove = () => {
    const vote = removing && votes?.[removing];
    if (!vote || vote.entry._id !== entry._id || isSending.current) return;
    isSending.current = true;
    setBusy(vote.category);
    void cancelMutation({ voteId: vote._id })
      .then(() => {
        setRemoving(null);
        track("vote_cancelled", { ...analytics, category: vote.category });
        showVoteToast(vote.category, "removed");
      })
      .catch(onApiError)
      .finally(() => {
        isSending.current = false;
        setBusy(null);
      });
  };

  return {
    state,
    sawInPerson,
    setSawInPerson,
    busy,
    justVoted,
    status: (category: VoteCategory) =>
      voteButtonStatus(
        votes,
        category,
        entry._id,
        sawInPerson,
        inPersonAllowed,
      ),
    // A vote button: sign in first, offer to remove a vote that's here, or
    // check before moving one from another entry
    vote: (category: VoteCategory) => {
      // Tappable rather than greyed out, so it can say what it's waiting for
      if (needsSeenAnswer) {
        setNudge({ entryId: entry._id, at: Date.now() });
        return;
      }
      if (state.step === "signedOut") {
        // Ready for when it sends itself, if they sign in without leaving
        readyVoteSound();
        pendingVotes.save(entry._id, category, sawInPerson);
        setIsSigningIn(true);
        return;
      }
      // Tapped themselves, so a stored one mustn't follow it
      pendingVotes.take(entry._id);
      const status = voteButtonStatus(
        votes,
        category,
        entry._id,
        sawInPerson,
        inPersonAllowed,
      );
      if (status === "voted") setRemoving(category);
      else if (status === "move") setSwitching(category);
      else tapToSend(category);
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
      if (switching) tapToSend(switching);
    },
    cancelSwitch: () => setSwitching(null),
    removing: state.step === "choose" ? removing : null,
    confirmRemove: remove,
    cancelRemove: () => setRemoving(null),
    retryLocation: geo.retry,
    needsSeenAnswer,
    // When they last tapped Vote without answering, null once they have
    nudgedAt: nudge?.entryId === entry._id ? nudge.at : null,
    // The category whose vote couldn't confirm their location
    locationFailed:
      state.step === "choose" && locationFailed?.entryId === entry._id
        ? locationFailed.category
        : null,
    retryVote: () => {
      if (locationFailed?.entryId === entry._id)
        tapToSend(locationFailed.category);
    },
    // Only offered for best display, as Most Jolly has no other prize
    voteAsPeoplesChoice: () => tapToSend("best_display", true),
  };
}
