import {
  Badge,
  Button,
  Card,
  Group,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { LOCATION_CHECK_LABELS, countsFor, placeName } from "./votesCsv";

// Every vote with where it came from. Flagged votes are ones whose location
// check didn't pass, like votes from overseas.
export default function VoteList({
  competitionId,
}: {
  competitionId: Id<"competitions"> | undefined;
}) {
  const [show, setShow] = useState<"all" | "flagged">("all");
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.competition.votes.listPage,
    { competitionId, flaggedOnly: show === "flagged" },
    { initialNumItems: 50 },
  );

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Votes</Text>
          <SegmentedControl
            size="xs"
            value={show}
            onChange={(value) => setShow(value as "all" | "flagged")}
            data={[
              { label: "All", value: "all" },
              { label: "Flagged", value: "flagged" },
            ]}
          />
        </Group>
        <ScrollArea>
          <Table striped withTableBorder miw={900}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>Entry</Table.Th>
                <Table.Th>Voter</Table.Th>
                <Table.Th>Counts for</Table.Th>
                <Table.Th>Ticked "seen in person"</Table.Th>
                <Table.Th>Location</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.map((vote) => (
                <Table.Tr key={vote._id}>
                  <Table.Td>{new Date(vote.castAt).toLocaleString()}</Table.Td>
                  <Table.Td>
                    #{vote.entryNumber ?? "-"} {vote.entryName}
                  </Table.Td>
                  <Table.Td>
                    {vote.voterName ?? "-"}
                    <Text size="xs" c="dimmed">
                      {vote.voterEmail}
                    </Text>
                  </Table.Td>
                  <Table.Td>{countsFor(vote)}</Table.Td>
                  <Table.Td>
                    {vote.sawInPerson === undefined
                      ? "-"
                      : vote.sawInPerson
                        ? "Yes"
                        : "No"}
                  </Table.Td>
                  <Table.Td>
                    {placeName(vote.location) || "-"}
                    {vote.locationCheck && (
                      <div>
                        <Badge
                          size="xs"
                          variant="light"
                          color={vote.locationCheck === "ok" ? "green" : "red"}
                        >
                          {LOCATION_CHECK_LABELS[vote.locationCheck]}
                        </Badge>
                      </div>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {results.length === 0 && status !== "LoadingFirstPage" && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text size="sm" c="dimmed" ta="center" py="sm">
                      {show === "flagged"
                        ? "No flagged votes."
                        : "No votes yet."}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {status === "CanLoadMore" && (
          <Button variant="light" onClick={() => loadMore(50)}>
            Show more
          </Button>
        )}
      </Stack>
    </Card>
  );
}
