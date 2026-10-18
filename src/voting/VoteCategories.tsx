import {
  Tabs,
  Badge,
  Button,
  Stack,
  Text,
  Card,
  Group,
  Center,
  Box,
} from "@mantine/core";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import {
  VOTE_CATEGORIES,
  VOTE_CATEGORY_DETAILS,
} from "../../convex/features/votes/schema";
import { routes } from "../routes";
import ExistingVoteCard from "./ExistingVoteCard";
import { useMyVotes } from "./useMyVotes";
import { VOTE_CATEGORY_STYLES } from "./voteCategoryStyles";

export default function VoteCategories({
  entryId,
  onClose,
  competitionId,
}: {
  entryId: Id<"entries">;
  competitionId?: Id<"competitions">;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<string | null>(VOTE_CATEGORIES[0]);

  const { status: votingStatus, isVoting, vote, cancel } = useMyVotes();

  if (!votingStatus || !competitionId)
    return (
      <Center py="xl">
        <Text c="dimmed">Loading voting status...</Text>
      </Center>
    );

  return (
    <Stack gap="md">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          {VOTE_CATEGORIES.map((category) => {
            const { Icon } = VOTE_CATEGORY_STYLES[category];
            return (
              <Tabs.Tab
                data-testid={`vote-category-${category}`}
                key={category}
                value={category}
                leftSection={<Icon size={16} />}
                rightSection={
                  votingStatus[category] ? (
                    <Badge color="green" variant="filled" size="xs">
                      ✓
                    </Badge>
                  ) : undefined
                }
              >
                {VOTE_CATEGORY_DETAILS[category].title}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {VOTE_CATEGORIES.map((category) => {
          const existingVote = votingStatus[category];
          const { Icon, color } = VOTE_CATEGORY_STYLES[category];

          return (
            <Tabs.Panel key={category} value={category} pt="md">
              <Stack gap="md">
                <Box
                  p="sm"
                  style={{
                    backgroundColor: "var(--mantine-color-gray-9)",
                    borderRadius: "var(--mantine-radius-sm)",
                    borderLeft: `3px solid var(--mantine-color-${color}-6)`,
                  }}
                >
                  <Group gap="md" align="flex-start" wrap="nowrap">
                    <Box
                      style={{
                        color: `var(--mantine-color-${color}-6)`,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={32} />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={500} mb={4}>
                        What to consider:
                      </Text>
                      <Text size="sm" c="dimmed">
                        {VOTE_CATEGORY_DETAILS[category].whatToConsider}
                      </Text>
                    </Box>
                  </Group>
                </Box>

                {existingVote ? (
                  <ExistingVoteCard
                    vote={existingVote}
                    onCancel={() => cancel(existingVote)}
                    onViewEntry={(viewedEntryId) => {
                      routes.entry({ entryId: viewedEntryId }).push();
                      onClose();
                    }}
                    currentEntryId={entryId}
                  />
                ) : (
                  <Card withBorder padding="md" style={{ display: "flex" }}>
                    <Button
                      data-testid={`cast-vote-${category}`}
                      color={color}
                      size="lg"
                      fullWidth
                      leftSection={<Icon size={20} />}
                      onClick={() =>
                        vote({ _id: entryId, competitionId }, category)
                      }
                      disabled={isVoting}
                      loading={isVoting}
                      style={{ height: "100%", minHeight: "60px" }}
                    >
                      Cast Your Vote
                    </Button>
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
