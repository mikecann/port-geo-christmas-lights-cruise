import {
  Container,
  Title,
  Stack,
  Card,
  Text,
  Button,
  Badge,
  Group,
  Divider,
  Tabs,
} from "@mantine/core";
import { IconClipboardList, IconDownload } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useMe } from "../../../auth/useMeHooks";
import { Breadcrumbs } from "../../../common/components/Breadcrumbs";
import { routes } from "../../../routes";
import PendingEntriesSection from "./PendingEntriesSection";
import ApprovedEntries from "./ApprovedEntries";
import RejectedEntries from "./RejectedEntries";

export default function EntryManagementPage() {
  const me = useMe();
  const stats = useQuery(api.admin.competition.entries.getStats);
  const allEntries = useQuery(
    api.admin.competition.entries.getAllEntriesForExport,
  );

  if (!me?.isCompetitionAdmin)
    return (
      <Container size="md" py="xl">
        <Text c="red">
          Access denied. Competition admin permissions required.
        </Text>
      </Container>
    );

  const breadcrumbItems = [
    {
      label: "Admin Panel",
      onClick: () => routes.admin().push(),
    },
    {
      label: "Entry Management",
      isActive: true,
    },
  ];

  // Keeping this named avoids burying the CSV generation flow inside the button JSX.
  // eslint-disable-next-line local/no-hoisted-single-use-handlers
  const downloadCSV = () => {
    if (!allEntries) return;

    const csvHeaders = [
      "user email",
      "user name",
      "entry number",
      "entry name",
      "entry address",
    ];

    const csvRows = allEntries.map((entry) => {
      const escapeCSV = (value: string | number | undefined) => {
        if (value === undefined || value === null) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n"))
          return `"${str.replace(/"/g, '""')}"`;
        return str;
      };

      return [
        escapeCSV(entry.userEmail),
        escapeCSV(entry.userName),
        escapeCSV(entry.entryNumber),
        escapeCSV(entry.entryName),
        escapeCSV(entry.entryAddress),
      ].join(",");
    });

    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateTimeStr = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `entrants-${dateTimeStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="sm">
        Entry Management
      </Title>

      <Breadcrumbs items={breadcrumbItems} />

      <Stack gap="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group justify="space-between">
              <Group>
                <IconClipboardList
                  size={32}
                  color="var(--mantine-color-green-6)"
                />
                <div>
                  <Text size="lg" fw={500}>
                    Competition Entry Review
                  </Text>
                  <Text size="sm" c="dimmed">
                    Review and manage all competition entries
                  </Text>
                </div>
              </Group>
              <Button
                leftSection={<IconDownload size={16} />}
                variant="light"
                onClick={downloadCSV}
                disabled={!allEntries}
              >
                Download CSV
              </Button>
            </Group>

            <Divider />

            <Tabs defaultValue="pending" pt="md">
              <Tabs.List>
                <Tabs.Tab
                  value="pending"
                  rightSection={
                    <Badge variant="light" color="yellow" size="sm">
                      {stats?.totalSubmittedEntries ?? "-"}
                    </Badge>
                  }
                >
                  Pending Review
                </Tabs.Tab>
                <Tabs.Tab
                  value="approved"
                  rightSection={
                    <Badge variant="light" color="green" size="sm">
                      {stats?.totalApprovedEntries ?? "-"}
                    </Badge>
                  }
                >
                  Approved
                </Tabs.Tab>
                <Tabs.Tab
                  value="rejected"
                  rightSection={
                    <Badge variant="light" color="red" size="sm">
                      {stats?.totalRejectedEntries ?? "-"}
                    </Badge>
                  }
                >
                  Rejected
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="pending" pt="lg">
                <PendingEntriesSection />
              </Tabs.Panel>

              <Tabs.Panel value="approved" pt="lg">
                <ApprovedEntries />
              </Tabs.Panel>

              <Tabs.Panel value="rejected" pt="lg">
                <RejectedEntries />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
