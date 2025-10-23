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
} from "@mantine/core";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { IconAward, IconMoodSmile, IconTrophy } from "@tabler/icons-react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Id } from "../../../convex/_generated/dataModel";
import type { VoteCategory } from "../../../convex/features/votes/schema";
import { VOTE_CATEGORIES } from "../../../convex/features/votes/schema";
import { AuthRequired } from "../../auth/AuthRequired";
import { useErrorCatchingMutation } from "../../common/errors";
import MyVoteEntryCard from "./MyVoteEntryCard";
import { routes } from "../../routes";

interface CategoryConfig {
  key: VoteCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const VOTE_CATEGORIES_CONFIG: CategoryConfig[] = [
  {
    key: "best_display",
    title: "Best Display",
    description:
      "Best Display highlights creativity, visual impact and overall presentation of the lights.",
    icon: <IconAward size={18} />,
  },
  {
    key: "most_jolly",
    title: "Most Jolly",
    description:
      "Most Jolly celebrates festive spirit, warmth and joy conveyed by the display.",
    icon: <IconMoodSmile size={18} />,
  },
];

export default function MyVotesPage() {
  const votes = useQuery(api.my.votes.list, {});

  const votesByCategory = useMemo(() => {
    const result: Record<VoteCategory, Doc<"votes">[]> = {
      best_display: [],
      most_jolly: [],
    };

    if (votes)
      votes.forEach((vote) => {
        result[vote.category].push(vote);
      });

    return result;
  }, [votes]);

  if (votes === undefined)
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
          {VOTE_CATEGORIES.map((category) => {
            const categoryConfig = VOTE_CATEGORIES_CONFIG.find(
              (config) => config.key === category,
            );
            if (!categoryConfig) return null;
            const votes = votesByCategory[category];

            return (
              <Card key={category} withBorder>
                <Group justify="space-between" align="center">
                  <Group>
                    {categoryConfig.icon}
                    <Text fw={600}>{categoryConfig.title}</Text>
                    <Badge color="blue" variant="light">
                      {votes.length} vote{votes.length === 1 ? "" : "s"}
                    </Badge>
                  </Group>
                </Group>

                <Text c="dimmed" size="sm" mt={4}>
                  {categoryConfig.description}
                </Text>

                <Stack gap="sm" mt="sm">
                  {votes.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      You have not voted in this category yet.
                    </Text>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                      {votes.map((vote) => (
                        <MyVoteEntryCard
                          key={vote._id}
                          entryId={vote.entryId}
                          voteId={vote._id}
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
