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
import { useIsPhone } from "../../../common/hooks/useIsPhone";
import { InfoTip } from "../../PageHeader";
import {
  LOCATION_CHECK_LABELS,
  countsFor,
  placeName,
  type AdminVote,
} from "./votesCsv";

// Every vote with where it came from. Flagged votes are ones whose location
// check didn't pass, like votes from overseas.
export default function VoteList({
  competitionId,
}: {
  competitionId: Id<"competitions"> | undefined;
}) {
  const [show, setShow] = useState<"all" | "flagged">("all");
  const isPhone = useIsPhone();
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

        {results.length > 0 && isPhone && (
          <Stack gap={0}>
            {results.map((vote) => (
              <VoteCard key={vote._id} vote={vote} />
            ))}
          </Stack>
        )}

        {results.length > 0 && !isPhone && (
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
                      <Text size="sm">{vote.voterName ?? "No name"}</Text>
                      {vote.voterEmail && (
                        <Text
                          size="xs"
                          c="dimmed"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {vote.voterEmail}
                        </Text>
                      )}
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
                      <VoteWhere vote={vote} size="sm" />
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text
                        size="sm"
                        c="dimmed"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {castAt(vote)}
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

const castAt = (vote: AdminVote) =>
  new Date(vote.castAt).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

// The table's five columns don't fit a phone, so there each vote is a short
// stack: the entry and when, who, then what it counts for and where from
function VoteCard({ vote }: { vote: AdminVote }) {
  return (
    <Stack
      gap={2}
      py="xs"
      style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
    >
      <Group justify="space-between" wrap="nowrap" align="baseline" gap="sm">
        <Text size="sm" fw={500} truncate miw={0}>
          <Text span c="dimmed" size="sm">
            #{vote.entryNumber ?? "-"}
          </Text>{" "}
          {vote.entryName}
        </Text>
        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {castAt(vote)}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" truncate title={vote.voterEmail ?? undefined}>
        {vote.voterName ?? "No name"}
        {vote.voterEmail && ` · ${vote.voterEmail}`}
      </Text>
      <Group justify="space-between" wrap="nowrap" align="baseline" gap="sm">
        <Text size="xs" truncate miw={0}>
          {countsFor(vote)}
          {vote.sawInPerson !== undefined && (
            <Text span size="xs" c="dimmed">
              {vote.sawInPerson ? " · saw it" : " · hasn't seen it"}
            </Text>
          )}
        </Text>
        <VoteWhere vote={vote} size="xs" />
      </Group>
    </Stack>
  );
}

function VoteWhere({ vote, size }: { vote: AdminVote; size: "xs" | "sm" }) {
  if (!vote.locationCheck)
    return (
      <Text size={size} c="dimmed">
        –
      </Text>
    );
  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      {vote.locationCheck !== "ok" && (
        <Tooltip label={LOCATION_CHECK_LABELS[vote.locationCheck]}>
          <IconFlag
            role="img"
            aria-label={LOCATION_CHECK_LABELS[vote.locationCheck]}
            size={14}
            color="var(--mantine-color-orange-5)"
            style={{ flexShrink: 0 }}
          />
        </Tooltip>
      )}
      <Text size={size} c="dimmed" truncate={size === "xs"}>
        {placeName(vote.location) || "Unknown"}
      </Text>
    </Group>
  );
}
