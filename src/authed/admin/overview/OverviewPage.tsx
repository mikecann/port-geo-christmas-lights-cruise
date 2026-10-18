import {
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconArrowRight, IconCircleCheck } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { routes } from "../../../routes";
import { AdminPageHeader } from "../AdminLayout";
import CompetitionSwitches from "./CompetitionSwitches";
import StatTile from "./StatTile";

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export default function OverviewPage() {
  const overview = useQuery(api.admin.competition.competitions.overview);

  if (!overview)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  const { entries, votes } = overview;
  const waiting = entries.totalSubmittedEntries;

  return (
    <Stack gap="xl">
      <AdminPageHeader
        title={`${overview.year} competition`}
        description="What's happening now, and what needs doing."
      />

      <Text fz={{ base: 20, sm: 24 }} fw={600}>
        Entries are {overview.entriesOpen ? "open" : "closed"}. Voting is{" "}
        {overview.votingOpen ? "open" : "closed"}.
      </Text>

      {waiting > 0 ? (
        <Card withBorder radius="md" padding="lg" bg="yellow.9">
          <Group justify="space-between" gap="md">
            <Stack gap={2}>
              <Text fw={700} size="lg" c="white">
                {plural(waiting, "entry needs", "entries need")} reviewing
              </Text>
              <Text size="sm" c="yellow.1">
                Approve or reject each one. The entrant gets an email either
                way.
              </Text>
            </Stack>
            <Button
              component="a"
              {...routes.adminEntries().link}
              color="dark"
              size="md"
              rightSection={<IconArrowRight size={18} />}
            >
              Start reviewing
            </Button>
          </Group>
        </Card>
      ) : (
        <Group gap="xs">
          <ThemeIcon color="green" variant="light" radius="xl">
            <IconCircleCheck size={18} />
          </ThemeIcon>
          <Text>No entries are waiting for review.</Text>
        </Group>
      )}

      <CompetitionSwitches
        entriesOpen={overview.entriesOpen}
        votingOpen={overview.votingOpen}
      />

      <Stack gap="sm">
        <Text fw={600} size="lg">
          Entries
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <StatTile
            label="Waiting for review"
            value={waiting}
            color="yellow"
            link={routes.adminEntries().link}
          />
          <StatTile
            label="Approved"
            value={entries.totalApprovedEntries}
            color="green"
            link={routes.adminEntries({ show: "approved" }).link}
          />
          <StatTile
            label="Rejected"
            value={entries.totalRejectedEntries}
            color="red"
            link={routes.adminEntries({ show: "rejected" }).link}
          />
          <StatTile
            label="Not sent in yet"
            help="Started an entry but haven't sent it for review"
            value={entries.totalUnsentEntries}
            color="gray"
            link={routes.adminEntries({ show: "unsent" }).link}
          />
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <Text fw={600} size="lg">
          Votes so far
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <StatTile
            label="All votes"
            help="These count for People's Choice"
            value={votes.total}
            color="blue"
            link={routes.adminVotes().link}
          />
          <StatTile
            label="In person"
            help="These also count for In-Person Favourites"
            value={votes.inPerson}
            color="grape"
            link={routes.adminVotes().link}
          />
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}
