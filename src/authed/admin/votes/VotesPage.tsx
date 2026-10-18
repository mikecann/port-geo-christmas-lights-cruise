import { Badge, Button, Group, Select, SimpleGrid, Stack } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useQuery, useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useErrorHandler } from "../../../common/errors";
import { downloadCsv } from "../../../common/utils/csv";
import { routes } from "../../../routes";
import { AdminPageHeader } from "../AdminLayout";
import StatTile from "../overview/StatTile";
import InPersonAreaSettings from "./InPersonAreaSettings";
import VoteList from "./VoteList";
import VoteResults from "./VoteResults";
import { votesToCsv } from "./votesCsv";

export default function VotesPage() {
  const competitionList = useQuery(api.public.competitions.list, {});
  const overview = useQuery(api.admin.competition.competitions.overview);
  // Unset means the current competition
  const [competitionId, setCompetitionId] = useState<Id<"competitions">>();
  const [isExporting, setIsExporting] = useState(false);
  const getAllVotes = useAction(
    api.admin.competition.votes.getAllVotesForExport,
  );
  const onApiError = useErrorHandler();

  const currentId = competitionList?.[0]?._id;
  const selectedId = competitionId ?? currentId;
  const isCurrent = selectedId === currentId;
  const year = competitionList?.find((c) => c._id === selectedId)?.year;

  return (
    <Stack gap="xl">
      <AdminPageHeader
        title="Votes and results"
        description="Who's ahead for the two public prizes, and every vote with where it came from. The judged prizes aren't voted on here."
        actions={
          <Group gap="xs">
            <Select
              aria-label="Competition year"
              w={100}
              data={(competitionList ?? []).map((c) => ({
                value: c._id,
                label: String(c.year),
              }))}
              value={selectedId ?? null}
              onChange={(value) =>
                setCompetitionId(
                  (value ?? undefined) as Id<"competitions"> | undefined,
                )
              }
              allowDeselect={false}
            />
            <Button
              leftSection={<IconDownload size={16} />}
              variant="default"
              loading={isExporting}
              onClick={() => {
                setIsExporting(true);
                getAllVotes({ competitionId: selectedId })
                  .then((votes) =>
                    downloadCsv(votesToCsv(votes), `votes-${year ?? ""}`),
                  )
                  .catch(onApiError)
                  .finally(() => setIsExporting(false));
              }}
            >
              Download votes (CSV)
            </Button>
          </Group>
        }
      />

      {isCurrent && overview && (
        <Stack gap="xs">
          <Group>
            <Badge
              size="lg"
              color={overview.votingOpen ? "green" : "gray"}
              variant={overview.votingOpen ? "filled" : "light"}
            >
              Voting is {overview.votingOpen ? "open" : "closed"}
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <StatTile
              label="All votes"
              help="These count for People's Choice"
              value={overview.votes.total}
              color="blue"
              link={routes.adminVotes().link}
            />
            <StatTile
              label="In person"
              help="These also count for In-Person Favourites"
              value={overview.votes.inPerson}
              color="grape"
              link={routes.adminVotes().link}
            />
          </SimpleGrid>
        </Stack>
      )}

      <VoteResults competitionId={selectedId} />
      <VoteList competitionId={selectedId} />
      {isCurrent && <InPersonAreaSettings />}
    </Stack>
  );
}
