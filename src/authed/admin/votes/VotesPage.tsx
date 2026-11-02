import { Button, Group, Select, Stack } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useQuery, useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useErrorHandler } from "../../../common/errors";
import { downloadCsv } from "../../../common/utils/csv";
import { PageHeader } from "../../PageHeader";
import VoteList from "./VoteList";
import VoteResults from "./VoteResults";
import { votesToCsv } from "./votesCsv";

export default function VotesPage() {
  const competitionList = useQuery(api.public.competitions.list, {});
  // Unset means the current competition
  const [competitionId, setCompetitionId] = useState<Id<"competitions">>();
  const [isExporting, setIsExporting] = useState(false);
  const getAllVotes = useAction(
    api.admin.competition.votes.getAllVotesForExport,
  );
  const onApiError = useErrorHandler();

  const currentId = competitionList?.[0]?._id;
  const selectedId = competitionId ?? currentId;
  const year = competitionList?.find((c) => c._id === selectedId)?.year;

  return (
    <Stack gap="xl">
      <PageHeader
        title="Votes"
        info="Who's ahead for the three public prizes, and every vote with where it came from. New Entrants and Judges' Favourites are judged, so they aren't voted on here. Where in-person votes can come from is on Settings."
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
              Download CSV
            </Button>
          </Group>
        }
      />

      <VoteResults competitionId={selectedId} />
      <VoteList competitionId={selectedId} />
    </Stack>
  );
}
