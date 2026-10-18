import {
  Container,
  Title,
  Stack,
  Loader,
  Card,
  Group,
  Text,
  Badge,
  Button,
  Alert,
} from "@mantine/core";
import { useQuery } from "convex/react";
import { IconTrophy } from "@tabler/icons-react";
import { api } from "../../../convex/_generated/api";
import { AuthRequired } from "../../auth/AuthRequired";
import MyVoteEntryCard from "./MyVoteEntryCard";
import { routes } from "../../routes";
import { votingClosedMessage } from "../../../shared/eventStatus";

export default function MyVotesPage() {
  const vote = useQuery(api.my.votes.mine, {});
  const competition = useQuery(api.public.competitions.current, {});

  if (vote === undefined || competition === undefined)
    return (
      <AuthRequired>
        <Container size="md" py="xl">
          <Stack align="center">
            <Loader size="lg" />
            <Text c="dimmed">Loading your vote...</Text>
          </Stack>
        </Container>
      </AuthRequired>
    );

  return (
    <AuthRequired>
      <Container size="md" py="xl">
        <Group justify="space-between" mb="xl">
          <Title order={1}>My Vote</Title>
          <Button
            component="a"
            {...routes.competitionDetails().link}
            leftSection={<IconTrophy size={18} />}
            variant="light"
            size="sm"
          >
            Competition Details
          </Button>
        </Group>

        <Stack gap="md">
          {competition.votingOpen ? (
            <Alert color="green" variant="light" title="Voting is open">
              You get one vote for the {competition.year} competition, and you
              can change it until voting closes.
            </Alert>
          ) : (
            <Alert color="yellow" variant="light" title="Voting is closed">
              {vote
                ? "Your vote is kept here as a read-only record."
                : votingClosedMessage(competition.year)}
            </Alert>
          )}

          <Card withBorder>
            {vote ? (
              <Stack gap="sm">
                <Group gap="xs">
                  <Text fw={600}>Your vote</Text>
                  <Badge
                    color={vote.inPerson ? "green" : "blue"}
                    variant="light"
                  >
                    {vote.inPerson
                      ? "In-Person Favourites and People's Choice"
                      : "People's Choice"}
                  </Badge>
                </Group>
                <MyVoteEntryCard entryId={vote.entry._id} />
              </Stack>
            ) : (
              <Stack gap="sm" align="flex-start">
                <Text c="dimmed" size="sm">
                  You haven't voted yet.
                </Text>
                {competition.votingOpen && (
                  <Button component="a" {...routes.voteLanding().link}>
                    Type the number on a sign
                  </Button>
                )}
              </Stack>
            )}
          </Card>
        </Stack>
      </Container>
    </AuthRequired>
  );
}
