import { Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconAward } from "@tabler/icons-react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { routes } from "../../routes";
import { eventForYear } from "../../../shared/event";
import { votingClosedCopy, votingPhase } from "../../../shared/voting";
import { InfoTip } from "../../authed/PageHeader";

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

  const phase = votingPhase(competition);
  if (phase !== "open") {
    const { title, detail } = votingClosedCopy(
      phase,
      eventForYear(competition.year),
    );
    return (
      <Card data-testid="voting-closed" withBorder radius="md" p="lg">
        <Stack gap={4} align="center">
          <Text fw={600} size="lg">
            {title}
          </Text>
          <Text c="dimmed" size="sm" ta="center">
            {detail}
          </Text>
        </Stack>
      </Card>
    );
  }

  return <VotingControls entryId={entryId} />;
}

function VotingControls({ entryId }: { entryId: Id<"entries"> }) {
  const { isAuthenticated } = useConvexAuth();
  const myVotes = useQuery(api.my.votes.mine, isAuthenticated ? {} : "skip");
  const votedHere =
    !!myVotes &&
    Object.values(myVotes).some((vote) => vote?.entry._id === entryId);

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md" align="center">
        <Group gap="xs">
          <IconAward size={20} color="var(--mantine-color-yellow-6)" />
          <Text fw={600} size="lg">
            Public vote
          </Text>
          <InfoTip>
            Everyone gets a vote for best display. If you've seen the display in
            person, you can vote Most Jolly too.
          </InfoTip>
        </Group>

        <Button
          data-testid="vote-entry"
          size="md"
          color="yellow"
          variant="filled"
          // Dark text: white on this orange is too faint to read at night
          autoContrast
          // Both go to this entry's vote page, which shows their vote here
          onClick={() => routes.entryVote({ entryId }).push()}
        >
          {votedHere ? "Change my vote" : "Vote"}
        </Button>
      </Stack>
    </Card>
  );
}
