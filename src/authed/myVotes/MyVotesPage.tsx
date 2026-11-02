import {
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { PageHeader } from "../PageHeader";
import { useQuery } from "convex/react";
import { IconDialpad } from "@tabler/icons-react";
import { api } from "../../../convex/_generated/api";
import { AuthRequired } from "../../auth/AuthRequired";
import MyVoteRow from "./MyVoteEntryCard";
import { routes } from "../../routes";
import { eventForYear } from "../../../shared/event";
import { VOTE_CATEGORIES } from "../../../convex/features/votes/schema";
import {
  awardName,
  VOTE_CATEGORY_NAMES,
  votingClosedCopy,
  votingPhase,
} from "../../../shared/voting";

export default function MyVotesPage() {
  const votes = useQuery(api.my.votes.mine, {});
  const competition = useQuery(api.public.competitions.current, {});

  if (votes === undefined || competition === undefined)
    return (
      <AuthRequired>
        <Box maw={800} py="xl">
          <Stack align="center">
            <Loader size="lg" />
            <Text c="dimmed">Loading your votes...</Text>
          </Stack>
        </Box>
      </AuthRequired>
    );

  const phase = votingPhase(competition);
  const isOpen = phase === "open";
  const closedCopy = isOpen
    ? null
    : votingClosedCopy(phase, eventForYear(competition.year));

  return (
    <AuthRequired>
      <Box maw={800}>
        <PageHeader
          title="My votes"
          info="You get a vote for best display, and a Most Jolly vote for a display you've seen in person. You can change them until voting closes."
          actions={
            <Group gap="xs">
              <Button
                component="a"
                {...routes.competitionDetails().link}
                variant="subtle"
                color="gray"
                size="sm"
              >
                Prizes
              </Button>
              {isOpen && (
                <Button
                  component="a"
                  {...routes.voteLanding().link}
                  leftSection={<IconDialpad size={18} aria-hidden />}
                  variant="light"
                  size="sm"
                >
                  Vote by number
                </Button>
              )}
            </Group>
          }
        />

        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {closedCopy
              ? `${closedCopy.title}. ${closedCopy.detail}`
              : "Voting is open. You can change your votes until it closes."}
          </Text>

          <Card withBorder py={0}>
            {VOTE_CATEGORIES.map((category, index) => {
              const vote = votes[category];
              return (
                <Box key={category}>
                  {index > 0 && <Divider />}
                  <MyVoteRow
                    title={VOTE_CATEGORY_NAMES[category].title}
                    vote={vote}
                    // Most Jolly only has the one prize, so it's only worth
                    // saying for best display
                    prize={
                      vote && category === "best_display"
                        ? awardName(vote)
                        : undefined
                    }
                    canChange={isOpen}
                  />
                </Box>
              );
            })}
          </Card>
        </Stack>
      </Box>
    </AuthRequired>
  );
}
