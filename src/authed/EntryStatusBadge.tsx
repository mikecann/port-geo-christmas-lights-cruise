import { Box, Group, Text } from "@mantine/core";
import type { EntryStateKind } from "../../convex/features/entries/schema";
import { ENTRY_STATUS_COLORS, ENTRY_STATUS_LABELS } from "./entryStatus";

// A coloured dot and the status in plain words, quieter than a badge so a
// list of them stays easy to read
export default function EntryStatusBadge({
  status,
  size = "sm",
  labelFrom,
}: {
  status: EntryStateKind;
  size?: "xs" | "sm";
  // Below this breakpoint only the dot shows, with the words in a tooltip
  labelFrom?: "sm";
}) {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      title={labelFrom ? ENTRY_STATUS_LABELS[status] : undefined}
    >
      <Box
        // When the words are hidden on a phone, the dot carries the status
        role={labelFrom ? "img" : undefined}
        aria-label={labelFrom ? ENTRY_STATUS_LABELS[status] : undefined}
        w={8}
        h={8}
        bg={`${ENTRY_STATUS_COLORS[status]}.6`}
        style={{ borderRadius: "50%", flexShrink: 0 }}
      />
      <Text
        size={size}
        style={{ whiteSpace: "nowrap" }}
        visibleFrom={labelFrom}
      >
        {ENTRY_STATUS_LABELS[status]}
      </Text>
    </Group>
  );
}
