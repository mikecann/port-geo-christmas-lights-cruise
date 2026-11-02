import {
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconFlag } from "@tabler/icons-react";
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { InfoTip } from "../AdminLayout";
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
    { initialNumItems: 20 },
  );

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap={6}>
            <Text fw={600}>Every vote</Text>
            <InfoTip>
              {show === "flagged"
                ? "Votes where the voter's internet connection wasn't in the in-person area, for example overseas. They still count for People's Choice, but not In-Person Favourites."
                : "Newest first. Each person has a best display vote and a Most Jolly vote, which they can change until voting closes."}
            </InfoTip>
          </Group>
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

        {results.length > 0 && (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing={6} fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Entry</Table.Th>
                  <Table.Th>Voter</Table.Th>
                  <Table.Th>Counts for</Table.Th>
                  <Table.Th>Where</Table.Th>
                  <Table.Th ta="right">When</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {results.map((vote) => (
                  <Table.Tr key={vote._id}>
                    <Table.Td>
                      <Text span c="dimmed" size="sm">
                        #{vote.entryNumber ?? "-"}
                      </Text>{" "}
                      {vote.entryName}
                    </Table.Td>
                    <Table.Td>
                      <Tooltip
                        label={vote.voterEmail}
                        disabled={!vote.voterEmail}
                      >
                        <Text size="sm" truncate maw={200}>
                          {vote.voterName ?? vote.voterEmail ?? "No name"}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      {countsFor(vote)}
                      {vote.sawInPerson !== undefined && (
                        <Text size="xs" c="dimmed">
                          {vote.sawInPerson
                            ? "Said they saw it"
                            : "Said they haven't seen it"}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {vote.locationCheck ? (
                        <Group gap={6} wrap="nowrap">
                          {vote.locationCheck !== "ok" && (
                            <Tooltip
                              label={LOCATION_CHECK_LABELS[vote.locationCheck]}
                            >
                              <IconFlag
                                size={14}
                                color="var(--mantine-color-orange-5)"
                              />
                            </Tooltip>
                          )}
                          <Text size="sm" c="dimmed">
                            {placeName(vote.location) || "Unknown"}
                          </Text>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          –
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text
                        size="sm"
                        c="dimmed"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {new Date(vote.castAt).toLocaleString(undefined, {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        {results.length === 0 && status !== "LoadingFirstPage" && (
          <Text size="sm" c="dimmed" ta="center" py="sm">
            {show === "flagged" ? "No flagged votes." : "No votes yet."}
          </Text>
        )}
        {status === "CanLoadMore" && (
          <Button variant="light" onClick={() => loadMore(50)}>
            Show more
          </Button>
        )}
      </Stack>
    </Card>
  );
}
