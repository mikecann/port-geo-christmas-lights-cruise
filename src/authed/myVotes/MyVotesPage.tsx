import {
  Container,
  Title,
  Stack,
  Loader,
  Card,
  Group,
  Text,
  Badge,
  SimpleGrid,
  Button,
  Alert,
} from "@mantine/core";
import { useQuery } from "convex/react";
import { IconTrophy } from "@tabler/icons-react";
import { api } from "../../../convex/_generated/api";
import {
  VOTE_CATEGORIES,
  VOTE_CATEGORY_DETAILS,
} from "../../../convex/features/votes/schema";
import { AuthRequired } from "../../auth/AuthRequired";
import MyVoteEntryCard from "./MyVoteEntryCard";
import { routes } from "../../routes";
import { votingClosedMessage } from "../../../shared/eventStatus";
import { VOTE_CATEGORY_STYLES } from "../../voting/voteCategoryStyles";

export default function MyVotesPage() {
  const votes = useQuery(api.my.votes.list, {});
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
              Your votes for the {competition.year} competition are shown below.
            </Alert>
          ) : (
            <Alert color="yellow" variant="light" title="Voting is closed">
              {votes.length > 0
                ? "Your previous votes are preserved here as a read-only record."
                : votingClosedMessage(competition.year)}
            </Alert>
          )}
          {VOTE_CATEGORIES.map((category) => {
            const { title, description } = VOTE_CATEGORY_DETAILS[category];
            const { Icon } = VOTE_CATEGORY_STYLES[category];
            const categoryVotes = votes.filter(
              (vote) => vote.category === category,
            );

            return (
              <Card key={category} withBorder>
                <Group justify="space-between" align="center">
                  <Group>
                    <Icon size={18} />
                    <Text fw={600}>{title}</Text>
                    <Badge color="blue" variant="light">
                      {categoryVotes.length} vote
                      {categoryVotes.length === 1 ? "" : "s"}
                    </Badge>
                  </Group>
                </Group>

                <Text c="dimmed" size="sm" mt={4}>
                  {description}
                </Text>

                <Stack gap="sm" mt="sm">
                  {categoryVotes.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      You have not voted in this category yet.
                    </Text>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                      {categoryVotes.map((vote) => (
                        <MyVoteEntryCard
                          key={vote._id}
                          entryId={vote.entryId}
                        />
                      ))}
                    </SimpleGrid>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      </Container>
    </AuthRequired>
  );
}
