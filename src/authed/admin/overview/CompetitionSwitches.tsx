import {
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { api } from "../../../../convex/_generated/api";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";

// What each switch means for the public, and what flipping it will do
const SWITCHES = {
  entries: {
    title: "Entries",
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
    title: "Voting",
    open: {
      now: "People can vote for approved entries, and change their vote.",
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
        "Anyone signed in can vote for one approved entry, and change their vote until you close voting.",
        "Votes from people who were there in person also count for In-Person Favourites.",
      ],
      button: "Open voting",
    },
  },
} as const;

export default function CompetitionSwitches({
  entriesOpen,
  votingOpen,
}: {
  entriesOpen: boolean;
  votingOpen: boolean;
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Switch kind="entries" isOpen={entriesOpen} />
      <Switch kind="voting" isOpen={votingOpen} />
    </SimpleGrid>
  );
}

function Switch({
  kind,
  isOpen,
}: {
  kind: keyof typeof SWITCHES;
  isOpen: boolean;
}) {
  const { confirm } = useConfirmation();
  const [setOpen, isSaving] = useErrorCatchingMutation(
    kind === "entries"
      ? api.admin.competition.competitions.setEntriesOpen
      : api.admin.competition.competitions.setVotingOpen,
  );
  const details = SWITCHES[kind];
  const state = isOpen ? details.open : details.closed;

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm" h="100%" justify="space-between">
        <Stack gap={6}>
          <Group justify="space-between">
            <Text fw={600} size="lg">
              {details.title}
            </Text>
            <Badge
              size="lg"
              color={isOpen ? "green" : "gray"}
              variant={isOpen ? "filled" : "light"}
            >
              {isOpen ? "Open" : "Closed"}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            {state.now}
          </Text>
        </Stack>
        <Button
          variant={isOpen ? "default" : "filled"}
          color={isOpen ? undefined : "green"}
          loading={isSaving}
          onClick={async () => {
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
          }}
        >
          {state.button}
        </Button>
      </Stack>
    </Card>
  );
}
