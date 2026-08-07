import { Button, Card, Group, Stack, Text, Badge, Center } from "@mantine/core";
import { IconAward } from "@tabler/icons-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { routes } from "../../routes";
import { VOTING_CLOSED_MESSAGE } from "../../../shared/eventStatus";

type Props = {
  entryId: Id<"entries">;
};

export default function EntryVoting({ entryId }: Props) {
  const competition = useQuery(api.public.competitions.current, {});

  if (!competition?.votingOpen)
    return (
      <Card data-testid="voting-closed" withBorder radius="md" p="lg">
        <Stack gap="sm" align="center">
          <Group gap="xs">
            <IconAward size={20} color="var(--mantine-color-yellow-6)" />
            <Text fw={600} size="lg">
              Voting Closed
            </Text>
          </Group>
          <Text c="dimmed" size="sm" ta="center">
            {VOTING_CLOSED_MESSAGE}
          </Text>
        </Stack>
      </Card>
    );

  return <VotingControls entryId={entryId} />;
}

function VotingControls({ entryId }: Props) {
  const { isAuthenticated } = useConvexAuth();

  const votingStatus = useQuery(
    api.my.votes.getStatus,
    isAuthenticated ? {} : "skip",
  );

  // Count how many votes the user has cast
  const votesCount = votingStatus
    ? Object.values(votingStatus).filter((vote) => vote != null).length
    : 0;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md" align="center">
        <Group gap="xs">
          <IconAward size={20} color="var(--mantine-color-yellow-6)" />
          <Text fw={600} size="lg">
            Public Vote
          </Text>
          {isAuthenticated && votesCount > 0 && (
            <Badge color="green" variant="light" size="sm">
              {votesCount}/2 votes cast
            </Badge>
          )}
        </Group>

        <Text c="dimmed" size="sm" ta="center">
          {isAuthenticated
            ? "Help choose the best Christmas light displays in Port Geographe!"
            : "Sign in to cast your vote and help choose the best displays!"}
        </Text>

        <Center>
          {isAuthenticated ? (
            <Button
              data-testid="vote-entry"
              size="md"
              color="yellow"
              variant="filled"
              onClick={() => routes.entryVote({ entryId }).push()}
            >
              Vote for this Entry
            </Button>
          ) : (
            <Button
              size="md"
              variant="light"
              onClick={() =>
                routes
                  .signin({
                    returnTo: window.location.pathname + window.location.search,
                  })
                  .push()
              }
            >
              Sign in to Vote
            </Button>
          )}
        </Center>
      </Stack>
    </Card>
  );
}
