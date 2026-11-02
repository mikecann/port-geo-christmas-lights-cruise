import { Stack } from "@mantine/core";
import { VOTE_CATEGORIES } from "../../convex/features/votes/schema";
import { useVoteFlow, votesOn, type VoteFlowEntry } from "./useVoteFlow";
import {
  AfterVoteLinks,
  CastVoteButton,
  CategoryVoteButtons,
  InPersonSlot,
  LocationFailedNotice,
  OwnEntryNotice,
  RemoveVoteConfirm,
  SignInSheet,
  SwitchVoteSheet,
  VoteBarLoading,
  VotedForOtherEntries,
  VotingClosedNotice,
} from "./VoteFlowParts";

const SINGLE_BUTTON_LABELS = {
  vote: "Vote for",
  voted: "Voted for",
  update: "Update my vote for",
  move: "Switch my vote to",
};

// The vote page's bottom bar: everything between seeing an entry and "your
// vote is in". It stays as it is after a vote, so the other one is a tap away.
export default function VoteFlow({
  entry,
  presumeSeen = false,
}: {
  entry: VoteFlowEntry;
  presumeSeen?: boolean;
}) {
  const flow = useVoteFlow(entry, { presumeSeen });
  const { state } = flow;

  if (state.step === "loading") return <VoteBarLoading />;
  if (state.step === "closed")
    return <VotingClosedNotice phase={state.phase} year={state.year} />;
  if (state.step === "ownEntry") return <OwnEntryNotice />;

  const votes = state.step === "choose" ? state.votes : null;
  const isHere = (vote: { entry: { _id: string } } | null | undefined) =>
    vote?.entry._id === entry._id;
  const hasVotedHere = votes ? votesOn(votes, entry._id).length > 0 : false;
  // Most Jolly is only for people who've seen it, so only they get both
  const canVoteMostJolly =
    state.inPersonAllowed === true && flow.sawInPerson === true;
  const categories = canVoteMostJolly
    ? VOTE_CATEGORIES
    : (["best_display"] as const);
  const otherVotes = categories.flatMap((category) => {
    const vote = votes?.[category];
    return vote && !isHere(vote) ? [vote] : [];
  });
  const bestDisplayStatus = flow.status("best_display");

  return (
    <Stack gap="sm">
      {otherVotes.length > 0 && <VotedForOtherEntries votes={otherVotes} />}
      <InPersonSlot
        inPersonAllowed={state.inPersonAllowed}
        canRetryLocation={state.canRetryLocation}
        peoplesChoiceReason={state.peoplesChoiceReason}
        value={flow.sawInPerson}
        nudgedAt={flow.nudgedAt}
        onChange={flow.setSawInPerson}
        onRetry={flow.retryLocation}
      />
      {canVoteMostJolly ? (
        <CategoryVoteButtons
          status={flow.status}
          busy={flow.busy}
          justVoted={flow.justVoted}
          removing={flow.removing}
          onVote={flow.vote}
          onRemove={flow.confirmRemove}
          onKeep={flow.cancelRemove}
        />
      ) : (
        <RemoveVoteConfirm
          category="best_display"
          opened={flow.removing === "best_display"}
          isBusy={flow.busy === "best_display"}
          onRemove={flow.confirmRemove}
          onKeep={flow.cancelRemove}
        >
          <CastVoteButton
            label={`${SINGLE_BUTTON_LABELS[bestDisplayStatus]} #${entry.entryNumber}`}
            isVoted={bestDisplayStatus === "voted"}
            isBusy={flow.busy === "best_display"}
            justVoted={flow.justVoted}
            // Wait for the location check, so the switch shows before they
            // vote, and then for an answer, so nobody is counted as "not
            // seen" by missing it. That wait still takes a tap, to say so.
            disabled={state.inPersonAllowed === null}
            isWaiting={flow.needsSeenAnswer}
            onClick={() => flow.vote("best_display")}
          />
        </RemoveVoteConfirm>
      )}
      {flow.locationFailed && (
        <LocationFailedNotice
          canVotePeoplesChoice={
            flow.locationFailed === "best_display" &&
            bestDisplayStatus !== "update"
          }
          onRetry={flow.retryVote}
          onPeoplesChoice={flow.voteAsPeoplesChoice}
        />
      )}
      {hasVotedHere && !flow.locationFailed && <AfterVoteLinks />}
      <SignInSheet
        opened={flow.isSigningIn}
        entryNumber={entry.entryNumber}
        onGoogle={flow.leaveForGoogle}
        onClose={flow.cancelSignIn}
      />
      {VOTE_CATEGORIES.map((category) => {
        const from = votes?.[category];
        if (!from || isHere(from)) return null;
        return (
          <SwitchVoteSheet
            key={category}
            opened={flow.switching === category}
            category={category}
            from={from.entry}
            to={entry}
            isBusy={flow.busy === category}
            onConfirm={flow.confirmSwitch}
            onClose={flow.cancelSwitch}
          />
        );
      })}
    </Stack>
  );
}
