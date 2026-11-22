import { Box, Group, Text } from "@mantine/core";
import type { EntryStateKind } from "../../convex/features/entries/schema";
import {
  ENTRY_STATUS_COLORS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_SHORT_LABELS,
} from "./entryStatus";

// A coloured dot and the status in plain words, quieter than a badge so a
// list of them stays easy to read
export default function EntryStatusBadge({
  status,
  size = "sm",
  labelFrom,
}: {
  status: EntryStateKind;
  size?: "xs" | "sm";
  // Below this breakpoint the status is one short word ("Waiting"), with the
  // full words in a tooltip
  labelFrom?: "sm";
}) {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      title={labelFrom ? ENTRY_STATUS_LABELS[status] : undefined}
    >
      <Box
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
      {labelFrom && (
        <Text
          size={size}
          style={{ whiteSpace: "nowrap" }}
          hiddenFrom={labelFrom}
        >
          {ENTRY_STATUS_SHORT_LABELS[status]}
        </Text>
      )}
    </Group>
  );
}
