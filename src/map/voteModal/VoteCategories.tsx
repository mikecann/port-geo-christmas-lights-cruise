import {
  Tabs,
  Badge,
  Button,
  Stack,
  Text,
  Card,
  Group,
  Alert,
  Center,
  Box,
} from "@mantine/core";
import { IconAward, IconMoodSmile, IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { VoteCategory } from "../../../convex/features/votes/schema";
import { VOTE_CATEGORIES } from "../../../convex/features/votes/schema";
import { useErrorCatchingMutation } from "../../common/errors";
import { routes } from "../../routes";
import ExistingVoteCard from "./ExistingVoteCard";

interface CategoryConfig {
  key: VoteCategory;
  title: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES_CONFIG: CategoryConfig[] = [
  {
    key: "best_display",
    title: "Best Display",
    description:
      "Creativity, visual impact and overall presentation of the lights",
    longDescription:
      "Vote for the home that impresses you most with its creativity, scale, and technical execution.",
    icon: <IconAward size={16} />,
    color: "blue",
  },
  {
    key: "most_jolly",
    title: "Most Jolly",
    description: "Festive spirit, warmth and joy conveyed by the display",
    longDescription:
      "Vote for the home that brings the most Christmas cheer and warm fuzzy feelings.",
    icon: <IconMoodSmile size={16} />,
    color: "grape",
  },
];

export default function VoteCategories({
  entryId,
  onClose,
}: {
  entryId: Id<"entries">;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<string | null>("best_display");

  const votingStatus = useQuery(api.my.votes.getStatus);
  const [voteForEntry, isVoting] = useErrorCatchingMutation(api.my.votes.vote);
  const [cancelVote, isCancelling] = useErrorCatchingMutation(
    api.my.votes.cancel,
  );

  if (!votingStatus)
    return (
      <Center py="xl">
        <Text c="dimmed">Loading voting status...</Text>
      </Center>
    );

  return (
    <Stack gap="md">
      {/* Info Alert */}
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        <Stack gap="sm">
          <div>
            <Text size="sm" fw={500}>
              Two Independent Awards
            </Text>
            <Text size="xs">
              You can vote once in each category. Choose different homes or vote
              for the same one twice!
            </Text>
          </div>
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              routes.competitionDetails().push();
              onClose();
            }}
          >
            Competition Details
          </Button>
        </Stack>
      </Alert>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          {CATEGORIES_CONFIG.map((category) => {
            const vote = votingStatus[category.key];
            return (
              <Tabs.Tab
                key={category.key}
                value={category.key}
                leftSection={category.icon}
                rightSection={
                  vote ? (
                    <Badge
                      color={vote ? "green" : "gray"}
                      variant={vote ? "filled" : "light"}
                      size="xs"
                    >
                      {vote ? "✓" : "?"}
                    </Badge>
                  ) : undefined
                }
              >
                {category.title}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {CATEGORIES_CONFIG.map((categoryConfig) => {
          const vote = votingStatus[categoryConfig.key];

          return (
            <Tabs.Panel
              key={categoryConfig.key}
              value={categoryConfig.key}
              pt="md"
            >
              <Stack gap="md">
                {/* Category Description - Always Visible */}
                <Box
                  p="sm"
                  style={{
                    backgroundColor: "var(--mantine-color-gray-9)",
                    borderRadius: "var(--mantine-radius-sm)",
                    borderLeft: `3px solid var(--mantine-color-${categoryConfig.color}-6)`,
                  }}
                >
                  <Text size="sm" fw={500} mb={4}>
                    What to consider:
                  </Text>
                  <Text size="sm" c="dimmed">
                    {categoryConfig.longDescription}
                  </Text>
                </Box>

                {vote ? (
                  <ExistingVoteCard
                    vote={vote}
                    onCancel={() => {
                      cancelVote({ voteId: vote._id });
                    }}
                    onViewEntry={(entryId) => {
                      routes.entry({ entryId }).push();
                      onClose();
                    }}
                    currentEntryId={entryId}
                  />
                ) : (
                  <Card withBorder padding="md">
                    <Stack gap="sm" align="center">
                      <div style={{ textAlign: "center" }}>
                        <Button
                          color={categoryConfig.color}
                          size="md"
                          leftSection={categoryConfig.icon}
                          onClick={() =>
                            voteForEntry({
                              entryId,
                              category: categoryConfig.key,
                            })
                          }
                          disabled={vote != null || isVoting}
                          loading={isVoting}
                        >
                          Cast Your Vote
                        </Button>
                      </div>
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Stack>
  );
}
