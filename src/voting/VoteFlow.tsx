import { Stack } from "@mantine/core";
import { VOTE_CATEGORIES } from "../../convex/features/votes/schema";
import { useVoteFlow, votesOn, type VoteFlowEntry } from "./useVoteFlow";
import {
  CastVoteButton,
  CategoryVoteButtons,
  ChangeVoteOptions,
  InPersonSlot,
  OwnEntryNotice,
  SignInSheet,
  SwitchVoteSheet,
  VoteBarLoading,
  VoteReceipt,
  VotedForOtherEntries,
  VotingClosedNotice,
} from "./VoteFlowParts";

// The vote page's bottom bar: everything between seeing an entry and "your
// vote is in"
export default function VoteFlow({ entry }: { entry: VoteFlowEntry }) {
  const flow = useVoteFlow(entry);
  const { state } = flow;

  if (state.step === "loading") return <VoteBarLoading />;
  if (state.step === "closed") return <VotingClosedNotice year={state.year} />;
  if (state.step === "ownEntry") return <OwnEntryNotice />;
  if (state.step === "voted")
    return (
      <VoteReceipt
        entryNumber={entry.entryNumber}
        votes={votesOn(state.votes, entry._id)}
        onChange={flow.startChanging}
      />
    );

  const votes = state.step === "choose" ? state.votes : null;
  const isHere = (vote: { entry: { _id: string } } | null | undefined) =>
    vote?.entry._id === entry._id;
  const votesHere = votes ? votesOn(votes, entry._id) : [];
  const needsSeenAnswer =
    state.inPersonAllowed === true && flow.sawInPerson === null;
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
  const bestDisplay = votes?.best_display;

  return (
    <Stack gap="sm">
      {otherVotes.length > 0 && <VotedForOtherEntries votes={otherVotes} />}
      <InPersonSlot
        inPersonAllowed={state.inPersonAllowed}
        canRetryLocation={state.canRetryLocation}
        value={flow.sawInPerson}
        onChange={flow.setSawInPerson}
        onRetry={flow.retryLocation}
      />
      {canVoteMostJolly ? (
        <CategoryVoteButtons
          isVotedHere={(category) => isHere(votes?.[category])}
          busy={flow.busy}
          onVote={flow.vote}
        />
      ) : (
        <CastVoteButton
          label={
            bestDisplay
              ? isHere(bestDisplay)
                ? `Update my vote for #${entry.entryNumber}`
                : `Switch my vote to #${entry.entryNumber}`
              : `Vote for #${entry.entryNumber}`
          }
          isBusy={flow.busy === "best_display"}
          // Wait for the location check, so the switch shows before they vote,
          // and then for an answer, so nobody is counted as "not seen" by
          // missing it
          disabled={state.inPersonAllowed === null || needsSeenAnswer}
          onClick={() => flow.vote("best_display")}
        />
      )}
      {votesHere.length > 0 && (
        <ChangeVoteOptions
          voteCount={votesHere.length}
          isBusy={flow.busy === "remove"}
          onRemove={flow.removeHere}
          onKeep={flow.stopChanging}
        />
      )}
      <SignInSheet
        opened={flow.isSigningIn}
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
