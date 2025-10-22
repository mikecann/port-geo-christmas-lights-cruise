import { Stack, Text, Center, Loader, Card, Table } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import EntryDetailsModal from "./entryDetailsModal/EntryDetailsModal";
import { getAddressString } from "../../../../shared/misc";

export default function RejectedEntries() {
  const rejectedEntries = useQuery(api.admin.competition.entries.listRejected);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Doc<"entries"> | null>(
    null,
  );

  return (
    <Stack gap="md">
      {rejectedEntries === undefined ? (
        <Center>
          <Loader size="md" />
        </Center>
      ) : rejectedEntries.length === 0 ? (
        <Card withBorder p="xl">
          <Center>
            <Stack gap="sm" align="center">
              <IconX size={48} color="gray" />
              <Text size="md" c="dimmed">
                No rejected entries
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Rejected entries will appear here after review.
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Card withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Address</Table.Th>
                <Table.Th>Rejected Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rejectedEntries.map((entry) => (
                <Table.Tr
                  key={entry._id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setModalOpened(true);
                  }}
                >
                  <Table.Td>{entry.name}</Table.Td>
                  <Table.Td>{getAddressString(entry.houseAddress)}</Table.Td>
                  <Table.Td>
                    {entry.status === "rejected"
                      ? new Date(entry.rejectedAt).toLocaleDateString()
                      : "-"}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <EntryDetailsModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        entry={selectedEntry}
      />
    </Stack>
  );
}
