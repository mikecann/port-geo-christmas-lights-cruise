import { Center, Loader, Stack } from "@mantine/core";
import { useVoteFlow, type VoteFlowEntry } from "./useVoteFlow";
import {
  CastVoteButton,
  ChangeVoteOptions,
  InPersonTick,
  LocationCheckingNotice,
  OwnEntryNotice,
  PeoplesChoiceOnlyNotice,
  SignInToVote,
  VoteConfirmation,
  VotedForAnotherEntry,
  VotingClosedNotice,
} from "./VoteFlowParts";

// Everything between seeing an entry and "your vote is in"
export default function VoteFlow({ entry }: { entry: VoteFlowEntry }) {
  const flow = useVoteFlow(entry);
  const { state } = flow;

  if (state.step === "loading")
    return (
      <Center py="md">
        <Loader />
      </Center>
    );
  if (state.step === "closed") return <VotingClosedNotice year={state.year} />;
  if (state.step === "signedOut")
    return <SignInToVote entryNumber={entry.entryNumber} />;
  if (state.step === "ownEntry") return <OwnEntryNotice />;
  if (state.step === "voted")
    return (
      <VoteConfirmation
        vote={state.vote}
        reason={state.reason}
        onChange={flow.startChanging}
      />
    );

  const { otherVote, currentVote } = state;
  return (
    <Stack gap="md">
      {otherVote && <VotedForAnotherEntry vote={otherVote} />}
      {state.inPersonAllowed && (
        <InPersonTick
          checked={flow.sawInPerson}
          onChange={flow.setSawInPerson}
        />
      )}
      {state.inPersonAllowed === null && <LocationCheckingNotice />}
      {state.reason && (
        <PeoplesChoiceOnlyNotice
          reason={state.reason}
          onRetry={state.canRetryLocation ? flow.retryLocation : undefined}
        />
      )}
      <CastVoteButton
        entryNumber={entry.entryNumber}
        label={
          otherVote
            ? `Switch my vote to #${entry.entryNumber}`
            : currentVote
              ? `Update my vote for #${entry.entryNumber}`
              : undefined
        }
        isBusy={flow.isBusy}
        // Wait for the location check, so the tick shows before they vote
        disabled={state.inPersonAllowed === null}
        onClick={flow.vote}
      />
      {currentVote && (
        <ChangeVoteOptions
          isBusy={flow.isBusy}
          onRemove={() => flow.remove(currentVote)}
          onKeep={flow.stopChanging}
        />
      )}
    </Stack>
  );
}
