import { Stack } from "@mantine/core";
import { useVoteFlow, type VoteFlowEntry } from "./useVoteFlow";
import {
  CastVoteButton,
  ChangeVoteOptions,
  InPersonSlot,
  OwnEntryNotice,
  SignInSheet,
  SwitchVoteSheet,
  VoteBarLoading,
  VoteReceipt,
  VotedForAnotherEntry,
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
    return <VoteReceipt vote={state.vote} onChange={flow.startChanging} />;

  const otherVote = state.step === "choose" ? state.otherVote : null;
  const currentVote = state.step === "choose" ? state.currentVote : null;
  const needsSeenAnswer =
    state.inPersonAllowed === true && flow.sawInPerson === null;
  return (
    <Stack gap="sm">
      {otherVote && <VotedForAnotherEntry vote={otherVote} />}
      <InPersonSlot
        inPersonAllowed={state.inPersonAllowed}
        canRetryLocation={state.canRetryLocation}
        value={flow.sawInPerson}
        onChange={flow.setSawInPerson}
        onRetry={flow.retryLocation}
      />
      <CastVoteButton
        label={
          otherVote
            ? `Switch my vote to #${entry.entryNumber}`
            : currentVote
              ? `Update my vote for #${entry.entryNumber}`
              : `Vote for #${entry.entryNumber}`
        }
        isBusy={flow.isBusy}
        // Wait for the location check, so the switch shows before they vote,
        // and then for an answer, so nobody is counted as "not seen" by
        // missing it
        disabled={state.inPersonAllowed === null || needsSeenAnswer}
        onClick={flow.vote}
      />
      {currentVote && (
        <ChangeVoteOptions
          isBusy={flow.isBusy}
          onRemove={() => flow.remove(currentVote)}
          onKeep={flow.stopChanging}
        />
      )}
      <SignInSheet
        opened={flow.isSigningIn}
        onGoogle={flow.leaveForGoogle}
        onClose={flow.cancelSignIn}
      />
      {otherVote && (
        <SwitchVoteSheet
          opened={flow.isConfirmingSwitch}
          from={otherVote.entry}
          to={entry}
          isBusy={flow.isBusy}
          onConfirm={flow.confirmSwitch}
          onClose={flow.cancelSwitch}
        />
      )}
    </Stack>
  );
}
