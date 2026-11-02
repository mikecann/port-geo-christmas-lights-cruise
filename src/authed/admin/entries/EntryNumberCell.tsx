import { Group, Text, Tooltip } from "@mantine/core";
import { IconFlag } from "@tabler/icons-react";

// An entry's number in a table, flagged orange when no sign was printed for it
export default function EntryNumberCell({
  entryNumber,
  isOutsideRange,
}: {
  entryNumber: number | undefined;
  isOutsideRange: boolean;
}) {
  if (entryNumber === undefined) return <Text c="dimmed">–</Text>;
  if (!isOutsideRange) return <Text>#{entryNumber}</Text>;
  return (
    <Tooltip
      label="No printed sign: this number is outside the number range"
      events={{ hover: true, focus: true, touch: true }}
    >
      {/* Focusable and labelled like InfoTip, so keyboard and screen reader
          users can find out why it's flagged too */}
      <Group
        gap={4}
        wrap="nowrap"
        tabIndex={0}
        role="img"
        aria-label={`#${entryNumber}, no printed sign`}
        style={{ cursor: "help" }}
      >
        <Text c="orange.5" fw={500}>
          #{entryNumber}
        </Text>
        <IconFlag size={14} color="var(--mantine-color-orange-5)" />
      </Group>
    </Tooltip>
  );
}
