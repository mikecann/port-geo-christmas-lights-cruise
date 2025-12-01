import {
  Container,
  Title,
  Stack,
  Card,
  Text,
  Group,
  Divider,
  Badge,
  Tabs,
  Button,
} from "@mantine/core";
import { IconListCheck, IconDownload } from "@tabler/icons-react";
import { useQuery, useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { useMe } from "../../../auth/useMeHooks";
import { Breadcrumbs } from "../../../common/components/Breadcrumbs";
import { routes } from "../../../routes";
import VoteCategoryTab from "./VoteCategoryTab";

export default function VoteManagementPage() {
  const me = useMe();
  const [activeTab, setActiveTab] = useState<string | null>("best_display");

  const bestCount = useQuery(api.admin.competition.votes.countForCategory, {
    category: "best_display",
  });
  const jollyCount = useQuery(api.admin.competition.votes.countForCategory, {
    category: "most_jolly",
  });
  const getAllVotes = useAction(
    api.admin.competition.votes.getAllVotesForExport,
  );

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

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="sm">
        Vote Management
      </Title>

      <Breadcrumbs items={breadcrumbItems} />

      <Stack gap="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group justify="space-between">
              <Group>
                <IconListCheck size={32} color="var(--mantine-color-blue-6)" />
                <div>
                  <Text size="lg" fw={500}>
                    Public Voting Overview
                  </Text>
                  <Text size="sm" c="dimmed">
                    Review votes by category and see who voted for each entry
                  </Text>
                </div>
              </Group>
              <Button
                leftSection={<IconDownload size={16} />}
                variant="light"
                onClick={async () => {
                  const allVotes = await getAllVotes();

                  const csvHeaders = [
                    "vote category",
                    "date and time of vote",
                    "entry number",
                    "voter email",
                    "voter name",
                  ];

                  const csvRows = allVotes.map((vote) => {
                    const escapeCSV = (value: string | number | undefined) => {
                      if (value === undefined || value === null) return "";
                      const str = String(value);
                      if (
                        str.includes(",") ||
                        str.includes('"') ||
                        str.includes("\n")
                      )
                        return `"${str.replace(/"/g, '""')}"`;
                      return str;
                    };

                    const dateTime = new Date(vote.dateTime).toISOString();

                    return [
                      escapeCSV(vote.voteCategory),
                      escapeCSV(dateTime),
                      escapeCSV(vote.entryNumber),
                      escapeCSV(vote.voterEmail),
                      escapeCSV(vote.voterName),
                    ].join(",");
                  });

                  const csvContent = [csvHeaders.join(","), ...csvRows].join(
                    "\n",
                  );
                  const blob = new Blob([csvContent], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);

                  const now = new Date();
                  const dateTimeStr = now
                    .toISOString()
                    .replace(/[:.]/g, "-")
                    .slice(0, -5);
                  const filename = `votes-${dateTimeStr}.csv`;

                  link.setAttribute("href", url);
                  link.setAttribute("download", filename);
                  link.style.visibility = "hidden";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Download CSV
              </Button>
            </Group>

            <Divider />

            <Tabs value={activeTab} onChange={setActiveTab} pt="md">
              <Tabs.List>
                <Tabs.Tab
                  value="best_display"
                  rightSection={
                    <Badge variant="light" color="blue" size="sm">
                      {bestCount}
                    </Badge>
                  }
                >
                  Best Display
                </Tabs.Tab>
                <Tabs.Tab
                  value="most_jolly"
                  rightSection={
                    <Badge variant="light" color="grape" size="sm">
                      {jollyCount}
                    </Badge>
                  }
                >
                  Most Jolly
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="best_display" pt="lg">
                {activeTab === "best_display" && (
                  <VoteCategoryTab category="best_display" />
                )}
              </Tabs.Panel>

              <Tabs.Panel value="most_jolly" pt="lg">
                {activeTab === "most_jolly" && (
                  <VoteCategoryTab category="most_jolly" />
                )}
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
