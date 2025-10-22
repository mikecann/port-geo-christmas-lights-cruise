import { Card, Text, Group, Table, ScrollArea, Stack } from "@mantine/core";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { useStableQuery } from "../../../common/hooks/useStableQuery";
import type { Doc } from "../../../../convex/_generated/dataModel";
import VotesTablePagination from "./VotesTablePagination";
import PageSizeSelector from "./PageSizeSelector";

interface VoteCategoryTabProps {
  category: Doc<"votes">["category"];
  pageSize?: number;
}

export default function VoteCategoryTab({
  category,
  pageSize: initialPageSize = 10,
}: VoteCategoryTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const offset = (page - 1) * pageSize;

  const total = useStableQuery(api.admin.competition.votes.countForCategory, {
    category,
  });

  const votes = useStableQuery(
    api.admin.competition.votes.listPageForCategory,
    {
      category,
      offset,
      numItems: pageSize,
    },
  );

  const isLoading = votes === undefined;
  const hasVotes = votes && votes.length > 0;
  const maxPages = Math.max(1, Math.ceil((total ?? 0) / pageSize));

  // Reset to page 1 when page size changes

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              {total ?? 0} vote{(total ?? 0) === 1 ? "" : "s"}
            </Text>
            <Text size="sm" c="dimmed">
              •
            </Text>
            <Text size="sm" c="dimmed">
              Showing {Math.min(offset + 1, total ?? 0)}-
              {Math.min(offset + pageSize, total ?? 0)}
            </Text>
          </Group>
          <PageSizeSelector
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </Group>
        <ScrollArea>
          <Table
            stickyHeader
            highlightOnHover
            striped
            withTableBorder
            withColumnBorders
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 100 }}>Entry #</Table.Th>
                <Table.Th>Entry name</Table.Th>
                <Table.Th>Voter email</Table.Th>
                <Table.Th>Voter name</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text size="sm" c="dimmed" ta="center" py="sm">
                      Loading...
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : hasVotes ? (
                votes.map((vote, idx) => (
                  <Table.Tr key={`${offset}-${idx}`}>
                    <Table.Td>{vote?.entryNumber ?? "-"}</Table.Td>
                    <Table.Td>{vote?.entryName ?? "Untitled Entry"}</Table.Td>
                    <Table.Td>{vote?.voterEmail ?? "-"}</Table.Td>
                    <Table.Td>{vote?.voterName ?? "-"}</Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text size="sm" c="dimmed" ta="center" py="sm">
                      No votes in this range.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <VotesTablePagination
          page={page}
          maxPages={maxPages}
          onPageChange={setPage}
        />
      </Stack>
    </Card>
  );
}
