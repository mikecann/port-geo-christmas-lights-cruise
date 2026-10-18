import { Button, Card, Group, Stack, Text, Badge, Center } from "@mantine/core";
import { IconAward } from "@tabler/icons-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { routes } from "../../routes";
import { votingClosedMessage } from "../../../shared/eventStatus";

type Props = {
  entryId: Id<"entries">;
  competitionId: Id<"competitions">;
};

export default function EntryVoting({ entryId, competitionId }: Props) {
  const competition = useQuery(api.public.competitions.current, {});
  const isPastEntry =
    competition !== undefined && competition._id !== competitionId;
  const allCompetitions = useQuery(
    api.public.competitions.list,
    isPastEntry ? {} : "skip",
  );

  if (competition === undefined) return null;

  if (isPastEntry) {
    const entryYear = allCompetitions?.find(
      (c) => c._id === competitionId,
    )?.year;
    if (entryYear === undefined) return null;
    return (
      <Text data-testid="past-entry-note" c="dimmed" size="sm">
        This was a {entryYear} entry
      </Text>
    );
  }

  if (!competition.votingOpen)
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
            {votingClosedMessage(competition.year)}
          </Text>
        </Stack>
      </Card>
    );

  return <VotingControls entryId={entryId} />;
}

function VotingControls({ entryId }: { entryId: Id<"entries"> }) {
  const { isAuthenticated } = useConvexAuth();
  const myVote = useQuery(api.my.votes.mine, isAuthenticated ? {} : "skip");
  const votedHere = myVote?.entry._id === entryId;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md" align="center">
        <Group gap="xs">
          <IconAward size={20} color="var(--mantine-color-yellow-6)" />
          <Text fw={600} size="lg">
            Public Vote
          </Text>
          {votedHere && (
            <Badge color="green" variant="light" size="sm">
              Your vote
            </Badge>
          )}
        </Group>

        <Text c="dimmed" size="sm" ta="center">
          Everyone gets one vote. If you've seen the display in person it counts
          for In-Person Favourites as well as People's Choice.
        </Text>

        <Center>
          <Button
            data-testid="vote-entry"
            size="md"
            color="yellow"
            variant="filled"
            onClick={() => routes.entryVote({ entryId }).push()}
          >
            {votedHere ? "See my vote" : "Vote for this Entry"}
          </Button>
        </Center>
      </Stack>
    </Card>
  );
}
