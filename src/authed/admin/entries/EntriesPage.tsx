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
import { IconCircleCheck, IconDownload } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { downloadCsv, toCsv } from "../../../common/utils/csv";
import { useRoute } from "../../../routes";
import { AdminPageHeader } from "../AdminLayout";
import AllEntries from "./AllEntries";
import ReviewCard from "./ReviewCard";

export default function EntriesPage() {
  const route = useRoute();
  const waiting = useQuery(api.admin.competition.entries.list, {
    status: "submitted",
  });
  const allEntries = useQuery(
    api.admin.competition.entries.getAllEntriesForExport,
  );

  return (
    <Stack gap="xl">
      <AdminPageHeader
        title="Entries"
        description="Review new entries first, then find any entry to see its details or change its number."
        actions={
          <Button
            leftSection={<IconDownload size={16} />}
            variant="default"
            disabled={!allEntries}
            onClick={() => {
              if (!allEntries) return;
              downloadCsv(
                toCsv(
                  [
                    "user email",
                    "user name",
                    "entry number",
                    "entry name",
                    "entry address",
                  ],
                  allEntries.map((entry) => [
                    entry.userEmail,
                    entry.userName,
                    entry.entryNumber,
                    entry.entryName,
                    entry.entryAddress,
                  ]),
                ),
                "entrants",
              );
            }}
          >
            Download list (CSV)
          </Button>
        }
      />

      <Stack gap="sm">
        <Text fw={600} size="lg">
          Waiting for review{waiting ? ` (${waiting.length})` : ""}
        </Text>
        {waiting === undefined ? (
          <Center py="lg">
            <Loader />
          </Center>
        ) : waiting.length === 0 ? (
          <Card withBorder radius="md">
            <Group gap="xs">
              <ThemeIcon color="green" variant="light" radius="xl">
                <IconCircleCheck size={18} />
              </ThemeIcon>
              <Text size="sm">
                You're all caught up. New entries will show up here.
              </Text>
            </Group>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {waiting.map((entry) => (
              <ReviewCard key={entry._id} entry={entry} />
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <Stack gap="sm">
        <Text fw={600} size="lg">
          All entries
        </Text>
        <AllEntries
          initialStatus={
            route.name === "adminEntries" ? route.params.show : undefined
          }
        />
      </Stack>
    </Stack>
  );
}
