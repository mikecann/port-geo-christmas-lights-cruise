import type { ReactNode } from "react";
import { Card, Divider, Group, Stack, Switch, Text } from "@mantine/core";
import { api } from "../../../../convex/_generated/api";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";
import { InfoTip } from "../../PageHeader";

// What each switch means for the public, and what flipping it will do
const SWITCHES = {
  entries: {
    title: "Entries are",
    open: {
      now: "People can start an entry and send it in for review.",
      confirmTitle: "Close entries?",
      effect: [
        "Nobody will be able to start a new entry or send one in.",
        "Entries already waiting for review stay in your queue, so you can still approve or reject them.",
        "Numbers kept for last year's entrants who haven't entered again are freed up.",
      ],
      button: "Close entries",
    },
    closed: {
      now: "Nobody can start or send in an entry. You can still review entries that came in before.",
      confirmTitle: "Open entries?",
      effect: [
        "Anyone signed in can start an entry and send it in for you to review.",
        "Last year's entrants get their old number back when they enter again.",
      ],
      button: "Open entries",
    },
  },
  voting: {
    title: "Voting is",
    open: {
      now: "People can vote for approved entries, and change their votes.",
      confirmTitle: "Close voting?",
      effect: [
        "Nobody will be able to vote or change their vote.",
        "Votes already cast are kept, so the results stay as they are.",
      ],
      button: "Close voting",
    },
    closed: {
      now: "Nobody can vote. Entries still show on the site and the map.",
      confirmTitle: "Open voting?",
      effect: [
        "Anyone signed in can vote for the best display, and change their vote until you close voting. It counts for In-Person Favourites if they saw it in person, and People's Choice if not.",
        "People who saw a display in person can vote for Most Jolly too.",
      ],
      button: "Open voting",
    },
  },
} as const;

// Whether entries and voting are open, as plain sentences with a switch each.
// Flipping one still asks first, as it changes the public site straight away.
export default function CompetitionSwitches({
  entriesOpen,
  votingOpen,
  entriesSummary,
  votingSummary,
}: {
  entriesOpen: boolean;
  votingOpen: boolean;
  entriesSummary: ReactNode;
  votingSummary: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding={0}>
      <SwitchRow kind="entries" isOpen={entriesOpen} summary={entriesSummary} />
      <Divider />
      <SwitchRow kind="voting" isOpen={votingOpen} summary={votingSummary} />
    </Card>
  );
}

function SwitchRow({
  kind,
  isOpen,
  summary,
}: {
  kind: keyof typeof SWITCHES;
  isOpen: boolean;
  summary: ReactNode;
}) {
  const { confirm } = useConfirmation();
  const [setOpen, isSaving] = useErrorCatchingMutation(
    kind === "entries"
      ? api.admin.competition.competitions.setEntriesOpen
      : api.admin.competition.competitions.setVotingOpen,
  );
  const details = SWITCHES[kind];
  const state = isOpen ? details.open : details.closed;

  const flip = async () => {
    const confirmed = await confirm({
      title: state.confirmTitle,
      content: (
        <Stack gap="xs">
          {state.effect.map((line) => (
            <Text key={line} size="sm">
              {line}
            </Text>
          ))}
          <Text size="sm" c="dimmed">
            You can change this back at any time.
          </Text>
        </Stack>
      ),
      confirmButton: state.button,
      confirmButtonColor: isOpen ? "red" : "green",
    });
    if (confirmed) await setOpen({ open: !isOpen });
  };

  return (
    <Group justify="space-between" wrap="nowrap" px="lg" py="md" gap="md">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Group gap={6} wrap="nowrap">
          <Text>
            {details.title}{" "}
            <Text span fw={700} c={isOpen ? "green.5" : undefined}>
              {isOpen ? "open" : "closed"}
            </Text>
          </Text>
          <InfoTip>{state.now}</InfoTip>
        </Group>
        <Text size="sm" c="dimmed">
          {summary}
        </Text>
      </Stack>
      <Switch
        size="md"
        color="green"
        checked={isOpen}
        disabled={isSaving}
        onChange={() => void flip()}
        aria-label={details.title.replace(/ (are|is)$/, " open")}
      />
    </Group>
  );
}
