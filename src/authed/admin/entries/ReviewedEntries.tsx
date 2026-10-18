import { Stack, Text, Center, Loader, Card, Table } from "@mantine/core";
import { IconTrophy, IconX } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import type { AdminEntry } from "../../../../convex/admin/competition/entries";
import EntryDetailsModal from "./entryDetailsModal/EntryDetailsModal";

type ReviewedStatus = "approved" | "rejected";

const EMPTY_STATES = {
  approved: {
    Icon: IconTrophy,
    title: "No approved entries yet",
    text: "Approved entries will appear here once they are reviewed.",
  },
  rejected: {
    Icon: IconX,
    title: "No rejected entries",
    text: "Rejected entries will appear here after review.",
  },
};

const reviewedAt = (entry: AdminEntry) => {
  if (entry.status === "approved") return entry.approvedAt;
  if (entry.status === "rejected") return entry.rejectedAt;
  return null;
};

export default function ReviewedEntries({
  status,
}: {
  status: ReviewedStatus;
}) {
  const reviewedEntries = useQuery(api.admin.competition.entries.list, {
    status,
  });
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AdminEntry | null>(null);
  const isApproved = status === "approved";
  const emptyState = EMPTY_STATES[status];

  return (
    <Stack gap="md">
      {reviewedEntries === undefined ? (
        <Center>
          <Loader size="md" />
        </Center>
      ) : reviewedEntries.length === 0 ? (
        <Card withBorder p="xl">
          <Center>
            <Stack gap="sm" align="center">
              <emptyState.Icon size={48} color="gray" />
              <Text size="md" c="dimmed">
                {emptyState.title}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {emptyState.text}
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Card withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {isApproved && <Table.Th>Entry #</Table.Th>}
                <Table.Th>Name</Table.Th>
                <Table.Th>Address</Table.Th>
                <Table.Th>{isApproved ? "Approved" : "Rejected"} Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reviewedEntries.map((entry) => {
                const date = reviewedAt(entry);
                return (
                  <Table.Tr
                    key={entry._id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedEntry(entry);
                      setModalOpened(true);
                    }}
                  >
                    {isApproved && (
                      <Table.Td>
                        {entry.status === "approved" ? entry.entryNumber : "-"}
                      </Table.Td>
                    )}
                    <Table.Td>{entry.name}</Table.Td>
                    <Table.Td>{entry.houseAddress?.address}</Table.Td>
                    <Table.Td>
                      {date ? new Date(date).toLocaleDateString() : "-"}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
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
