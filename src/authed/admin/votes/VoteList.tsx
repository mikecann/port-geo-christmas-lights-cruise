import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  SegmentedControl,
  Stack,
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
    { initialNumItems: 20 },
  );

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Every vote, newest first</Text>
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
        <Text size="sm" c="dimmed">
          {show === "flagged"
            ? "Votes where the voter's internet connection wasn't in the in-person area, for example overseas. They still count for People's Choice, but not In-Person Favourites."
            : "Each person has one vote, which they can change until voting closes."}
        </Text>

        {results.map((vote) => (
          <Paper key={vote._id} withBorder radius="md" p="sm">
            <Stack gap={4}>
              <Group justify="space-between" gap="xs">
                <Text fw={500}>
                  #{vote.entryNumber ?? "-"} {vote.entryName}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(vote.castAt).toLocaleString()}
                </Text>
              </Group>
              <Text size="sm" style={{ wordBreak: "break-word" }}>
                {vote.voterName ?? "No name"}{" "}
                <Text span size="xs" c="dimmed">
                  {vote.voterEmail}
                </Text>
              </Text>
              <Text size="sm">Counts for {countsFor(vote)}</Text>
              {vote.sawInPerson !== undefined && (
                <Text size="xs" c="dimmed">
                  Ticked "I've seen this display in person":{" "}
                  {vote.sawInPerson ? "yes" : "no"}
                </Text>
              )}
              {vote.locationCheck && (
                <Group gap={6}>
                  <Badge
                    size="sm"
                    variant="light"
                    color={vote.locationCheck === "ok" ? "green" : "red"}
                  >
                    {LOCATION_CHECK_LABELS[vote.locationCheck]}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {placeName(vote.location) || "Location unknown"}
                  </Text>
                </Group>
              )}
            </Stack>
          </Paper>
        ))}

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
