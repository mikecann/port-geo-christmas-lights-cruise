import { Center, Loader, Stack } from "@mantine/core";
import { SEEN_IN_PERSON_REQUIRED_MESSAGE } from "../../shared/voting";
import { useVoteFlow, type VoteFlowEntry } from "./useVoteFlow";
import {
  CastVoteButton,
  ChangeVoteOptions,
  InPersonSwitch,
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
  const needsSeenAnswer =
    state.inPersonAllowed === true && flow.sawInPerson === null;
  return (
    <Stack gap="md">
      {otherVote && <VotedForAnotherEntry vote={otherVote} />}
      {state.inPersonAllowed && (
        <InPersonSwitch
          value={flow.sawInPerson}
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
        // Wait for the location check, so the switch shows before they vote,
        // and then for an answer, so nobody is counted as "not seen" by
        // missing it
        disabled={state.inPersonAllowed === null || needsSeenAnswer}
        hint={needsSeenAnswer ? SEEN_IN_PERSON_REQUIRED_MESSAGE : undefined}
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
