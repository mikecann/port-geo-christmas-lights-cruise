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
import {
  VOTE_CATEGORIES,
  VOTE_CATEGORY_DETAILS,
} from "../../../convex/features/votes/schema";
import { awardName } from "../../../shared/voting";

export default function MyVotesPage() {
  const votes = useQuery(api.my.votes.mine, {});
  const competition = useQuery(api.public.competitions.current, {});

  if (votes === undefined || competition === undefined)
    return (
      <AuthRequired>
        <Container size="md" py="xl">
          <Stack align="center">
            <Loader size="lg" />
            <Text c="dimmed">Loading your votes...</Text>
          </Stack>
        </Container>
      </AuthRequired>
    );

  const hasVoted = votes.best_display !== null || votes.most_jolly !== null;

  return (
    <AuthRequired>
      <Container size="md" py="xl">
        <Group justify="space-between" mb="xl">
          <Title order={1}>My Votes</Title>
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
              You get a vote for best display, and a Most Jolly vote for a
              display you've seen in person. You can change them until voting
              closes.
            </Alert>
          ) : (
            <Alert color="yellow" variant="light" title="Voting is closed">
              {hasVoted
                ? "Your votes are kept here as a read-only record."
                : votingClosedMessage(competition.year)}
            </Alert>
          )}

          {VOTE_CATEGORIES.map((category) => {
            const vote = votes[category];
            return (
              <Card key={category} withBorder>
                <Stack gap="sm">
                  <Group gap="xs">
                    <Text fw={600}>
                      {VOTE_CATEGORY_DETAILS[category].title}
                    </Text>
                    {vote && (
                      <Badge
                        color={vote.inPerson ? "green" : "blue"}
                        variant="light"
                      >
                        {awardName(vote)}
                      </Badge>
                    )}
                  </Group>
                  {vote ? (
                    <MyVoteEntryCard entryId={vote.entry._id} />
                  ) : (
                    <Text c="dimmed" size="sm">
                      {category === "most_jolly"
                        ? "No vote yet. It's for a display you've seen in person."
                        : "No vote yet."}
                    </Text>
                  )}
                </Stack>
              </Card>
            );
          })}

          {competition.votingOpen && (
            <Button
              component="a"
              {...routes.voteLanding().link}
              style={{ alignSelf: "flex-start" }}
            >
              Type the number on a sign
            </Button>
          )}
        </Stack>
      </Container>
    </AuthRequired>
  );
}
