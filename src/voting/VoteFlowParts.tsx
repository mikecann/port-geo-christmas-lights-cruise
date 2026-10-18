// The pieces of the vote flow. Plain on purpose: the final look gets picked
// from mock-ups, so each piece only takes what it shows.
import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconArrowsLeftRight,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import classes from "./InPersonSwitch.module.css";
import { routes } from "../routes";
import { votingClosedMessage } from "../../shared/eventStatus";
import type { MyVote } from "./useVoteFlow";

export function VotingClosedNotice({ year }: { year: number }) {
  return (
    <Alert data-testid="voting-closed" color="yellow" title="Voting is closed">
      {votingClosedMessage(year)}
    </Alert>
  );
}

export function SignInToVote({ entryNumber }: { entryNumber: number }) {
  return (
    <Stack gap="xs">
      <Text ta="center">Sign in to vote for #{entryNumber}. It's quick.</Text>
      <Button
        size="xl"
        fullWidth
        onClick={() =>
          routes
            .signin({
              returnTo: window.location.pathname + window.location.search,
            })
            .push()
        }
      >
        Sign in to vote
      </Button>
    </Stack>
  );
}

export function OwnEntryNotice() {
  return (
    <Alert color="blue" title="This is your entry">
      You can't vote for your own display, but you can vote for any other one
      you love. Thanks for lighting up the canals!
    </Alert>
  );
}

export function VotedForAnotherEntry({ vote }: { vote: MyVote }) {
  return (
    <Alert color="yellow" icon={<IconInfoCircle />}>
      You've already voted for #{vote.entry.entryNumber} {vote.entry.name}. You
      can switch your vote to this one instead.
    </Alert>
  );
}

export function LocationCheckingNotice() {
  return (
    <Group gap="xs" justify="center">
      <Loader size="xs" />
      <Text size="sm" c="dimmed">
        Checking where you're voting from…
      </Text>
    </Group>
  );
}

export function PeoplesChoiceOnlyNotice({
  reason,
  onRetry,
}: {
  reason: string;
  onRetry?: () => void;
}) {
  return (
    <Stack gap={4} align="center">
      <Text size="sm" c="dimmed" ta="center">
        {reason}
      </Text>
      {onRetry && (
        <Button variant="subtle" size="xs" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Stack>
  );
}

// Three stops, with "not answered" in the middle, so nobody is counted as
// "not seen" just because they missed it
export function InPersonSwitch({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Text fw={600} ta="center">
          Have you seen this display in person?
        </Text>
        <SegmentedControl
          data-testid="seen-in-person"
          fullWidth
          size="lg"
          radius="xl"
          classNames={classes}
          mod={{ unset: value === null }}
          color={value === null ? undefined : value ? "green" : "blue"}
          value={value === null ? "unset" : value ? "seen" : "notSeen"}
          onChange={(next) =>
            onChange(next === "unset" ? null : next === "seen")
          }
          data={[
            { value: "seen", label: "I've seen it" },
            {
              value: "unset",
              label: (
                <>
                  <IconArrowsLeftRight size={18} aria-hidden />
                  <VisuallyHidden>Not answered yet</VisuallyHidden>
                </>
              ),
            },
            { value: "notSeen", label: "I haven't seen it" },
          ]}
        />
        <Text size="sm" c="dimmed" ta="center">
          Seen it from a boat or the shore? Then your vote counts for In-Person
          Favourites as well as People's Choice.
        </Text>
      </Stack>
    </Card>
  );
}

export function CastVoteButton({
  entryNumber,
  label,
  isBusy,
  disabled,
  hint,
  onClick,
}: {
  entryNumber: number;
  label?: string;
  isBusy: boolean;
  disabled?: boolean;
  // Why it's greyed out
  hint?: string;
  onClick: () => void;
}) {
  return (
    <Stack gap={6}>
      <Button
        data-testid="cast-vote"
        size="xl"
        fullWidth
        color="yellow"
        loading={isBusy}
        disabled={disabled}
        onClick={onClick}
      >
        {label ?? `Vote for #${entryNumber}`}
      </Button>
      {hint && (
        <Text size="sm" c="dimmed" ta="center" data-testid="cast-vote-hint">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

export function VoteConfirmation({
  vote,
  reason,
  onChange,
}: {
  vote: MyVote;
  reason: string | null;
  onChange: () => void;
}) {
  return (
    <Card withBorder padding="lg" data-testid="vote-confirmation">
      <Stack gap="sm" align="center">
        <Group gap="xs">
          <IconCircleCheck size={28} color="var(--mantine-color-green-6)" />
          <Text fw={700} size="xl">
            Your vote for #{vote.entry.entryNumber} is in
          </Text>
        </Group>
        <Text ta="center">
          {vote.inPerson
            ? "It counts for In-Person Favourites and People's Choice."
            : "It counts for People's Choice."}
        </Text>
        {reason && (
          <Text size="sm" c="dimmed" ta="center">
            {reason}
          </Text>
        )}
        <Text size="sm" c="dimmed" ta="center">
          You can change it until voting closes.
        </Text>
        <Button variant="light" onClick={onChange}>
          Change my vote
        </Button>
      </Stack>
    </Card>
  );
}

export function ChangeVoteOptions({
  isBusy,
  onRemove,
  onKeep,
}: {
  isBusy: boolean;
  onRemove: () => void;
  onKeep: () => void;
}) {
  return (
    <Stack gap="xs" align="center">
      <Text size="sm" c="dimmed" ta="center">
        To vote for a different display,{" "}
        <Anchor {...routes.voteLanding().link}>type its number</Anchor>.
      </Text>
      <Group>
        <Button variant="subtle" onClick={onKeep} disabled={isBusy}>
          Keep my vote
        </Button>
        <Button
          variant="subtle"
          color="red"
          onClick={onRemove}
          loading={isBusy}
        >
          Remove my vote
        </Button>
      </Group>
    </Stack>
  );
}
