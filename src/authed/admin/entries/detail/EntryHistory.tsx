import { Anchor, Group, Stack, Text, Timeline } from "@mantine/core";
import type { AdminEntryDetail } from "../../../../../convex/admin/competition/entries";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { routes } from "../../../../routes";
import EntryStatusBadge from "../EntryStatusBadge";

const when = (time: number) =>
  new Date(time).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

// What happened to this entry, then the same person's entries in earlier years
export default function EntryHistory({
  entry,
  earlierEntries,
}: {
  entry: Doc<"entries">;
  earlierEntries: AdminEntryDetail["earlierEntries"];
}) {
  const events = [
    { title: "Started", time: entry._creationTime },
    ...("submittedAt" in entry
      ? [{ title: "Sent in for review", time: entry.submittedAt }]
      : []),
    ...(entry.status === "approved"
      ? [{ title: "Approved", time: entry.approvedAt }]
      : []),
    ...(entry.status === "rejected"
      ? [{ title: "Rejected", time: entry.rejectedAt }]
      : []),
  ];

  return (
    <Stack gap="lg">
      <Timeline active={events.length - 1} bulletSize={14} lineWidth={2}>
        {events.map((event) => (
          <Timeline.Item key={event.title} title={event.title}>
            <Text size="xs" c="dimmed">
              {when(event.time)}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>

      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Earlier years with this account
        </Text>
        {earlierEntries.length === 0 ? (
          <Text size="sm" c="dimmed">
            None.
          </Text>
        ) : (
          earlierEntries.map((earlier) => (
            <Group key={earlier._id} gap="xs">
              <Text size="sm" w={44}>
                {earlier.year}
              </Text>
              <Anchor
                size="sm"
                {...routes.adminEntry({ entryId: earlier._id }).link}
              >
                {earlier.entryNumber === undefined
                  ? earlier.name || "No name"
                  : `#${earlier.entryNumber} ${earlier.name}`}
              </Anchor>
              <EntryStatusBadge status={earlier.status} />
            </Group>
          ))
        )}
      </Stack>
    </Stack>
  );
}
