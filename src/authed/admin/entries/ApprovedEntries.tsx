import { Stack, Text, Center, Loader, Card, Table } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import EntryDetailsModal from "./entryDetailsModal/EntryDetailsModal";
import { getAddressString } from "../../../../shared/misc";

export default function ApprovedEntries() {
  const approvedEntries = useQuery(api.admin.competition.entries.listApproved);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Doc<"entries"> | null>(
    null,
  );

  return (
    <Stack gap="md">
      {approvedEntries === undefined ? (
        <Center>
          <Loader size="md" />
        </Center>
      ) : approvedEntries.length === 0 ? (
        <Card withBorder p="xl">
          <Center>
            <Stack gap="sm" align="center">
              <IconTrophy size={48} color="gray" />
              <Text size="md" c="dimmed">
                No approved entries yet
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Approved entries will appear here once they are reviewed.
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Card withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Entry #</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Address</Table.Th>
                <Table.Th>Approved Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {approvedEntries.map((entry) => (
                <Table.Tr
                  key={entry._id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setModalOpened(true);
                  }}
                >
                  <Table.Td>
                    {entry.status === "approved" ? entry.entryNumber : "-"}
                  </Table.Td>
                  <Table.Td>{entry.name}</Table.Td>
                  <Table.Td>{getAddressString(entry.houseAddress)}</Table.Td>
                  <Table.Td>
                    {entry.status === "approved"
                      ? new Date(entry.approvedAt).toLocaleDateString()
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
