import type { ReactNode } from "react";
import { Group, Stack, Text } from "@mantine/core";
import type { Doc } from "../../../convex/_generated/dataModel";

// The top of every My entry card: the entry's name as the title, a quiet
// status line under it, and the number large on the right, because that's
// what's printed on their sign
export default function EntryCardHeader({
  entry,
  title,
  status,
  numberCaption,
  actions,
}: {
  entry: Doc<"entries">;
  // Defaults to the entry's name. The draft passes the name being typed.
  title?: ReactNode;
  status: ReactNode;
  // A dimmed line under the number, e.g. that it's kept from last year
  numberCaption?: ReactNode;
  actions?: ReactNode;
}) {
  const name = entry.state.name?.trim();
  // A rejected entry's number goes back in the pool, so it isn't theirs
  const entryNumber =
    // A withdrawn entry still holds its number (its sign is out there)
    entry.state.kind === "rejected" && entry.state.approvedAt === undefined
      ? undefined
      : entry.state.entryNumber;

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
        {title ?? (
          <Text fw={600} fz={20} lh={1.25} style={{ overflowWrap: "anywhere" }}>
            {name || "Your entry"}
          </Text>
        )}
        {status}
      </Stack>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {entryNumber !== undefined && (
          <Stack gap={2} align="flex-end">
            <Text fz={32} fw={700} lh={1} aria-label={`Number ${entryNumber}`}>
              #{entryNumber}
            </Text>
            {numberCaption && (
              <Text size="xs" c="dimmed" ta="right">
                {numberCaption}
              </Text>
            )}
          </Stack>
        )}
        {actions}
      </Group>
    </Group>
  );
}
