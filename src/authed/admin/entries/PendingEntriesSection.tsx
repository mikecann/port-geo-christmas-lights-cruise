import { Stack, Card, Text, Center, Loader, SimpleGrid } from "@mantine/core";
import { IconClipboardList } from "@tabler/icons-react";
import { Doc } from "../../../../convex/_generated/dataModel";
import EntryCard from "./EntryCard";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function PendingEntriesSection() {
  const pendingEntries = useQuery(api.admin.competition.entries.listPending);

  return (
    <Stack gap="md">
      {pendingEntries === undefined ? (
        <Center>
          <Loader size="md" />
        </Center>
      ) : pendingEntries.length === 0 ? (
        <Card withBorder p="xl">
          <Center>
            <Stack gap="sm" align="center">
              <IconClipboardList size={48} color="gray" />
              <Text size="md" c="dimmed">
                No entries pending review
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                All submitted entries have been reviewed or no entries have been
                submitted yet.
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {pendingEntries.map((entry) => (
            <EntryCard key={entry._id} entry={entry} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
