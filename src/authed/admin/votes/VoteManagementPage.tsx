import {
  Container,
  Title,
  Stack,
  Card,
  Text,
  Group,
  Button,
  Select,
} from "@mantine/core";
import { IconListCheck, IconDownload } from "@tabler/icons-react";
import { useQuery, useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMe } from "../../../auth/useMeHooks";
import { Breadcrumbs } from "../../../common/components/Breadcrumbs";
import { useErrorHandler } from "../../../common/errors";
import { routes } from "../../../routes";
import InPersonAreaSettings from "./InPersonAreaSettings";
import VoteList from "./VoteList";
import VoteResults from "./VoteResults";
import { downloadCsv, votesToCsv } from "./votesCsv";

export default function VoteManagementPage() {
  const me = useMe();
  const competitionList = useQuery(api.public.competitions.list, {});
  // Unset means the current competition
  const [competitionId, setCompetitionId] = useState<Id<"competitions">>();
  const [isExporting, setIsExporting] = useState(false);
  const getAllVotes = useAction(
    api.admin.competition.votes.getAllVotesForExport,
  );
  const onApiError = useErrorHandler();

  const breadcrumbItems = [
    {
      label: "Admin Panel",
      onClick: () => routes.admin().push(),
    },
    {
      label: "Vote Management",
      isActive: true,
    },
  ];

  const isAllowed = Boolean(me?.isCompetitionAdmin || me?.isSystemAdmin);
  if (!isAllowed)
    return (
      <Container size="md" py="xl">
        <Text c="red">
          Access denied. Competition or system admin permissions required.
        </Text>
      </Container>
    );

  const currentId = competitionList?.[0]?._id;
  const selectedId = competitionId ?? currentId;
  const year = competitionList?.find((c) => c._id === selectedId)?.year;

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="sm">
        Vote Management
      </Title>

      <Breadcrumbs items={breadcrumbItems} />

      <Stack gap="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <Group>
              <IconListCheck size={32} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="lg" fw={500}>
                  Public voting results
                </Text>
                <Text size="sm" c="dimmed">
                  Who's ahead, and every vote with where it came from
                </Text>
              </div>
            </Group>
            <Group>
              <Select
                aria-label="Competition year"
                w={110}
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
                variant="light"
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
          </Group>
        </Card>

        <VoteResults competitionId={selectedId} />
        <VoteList competitionId={selectedId} />
        {selectedId === currentId && <InPersonAreaSettings />}
      </Stack>
    </Container>
  );
}
