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
    <Tooltip label="No printed sign: this number is outside the number range">
      <Group gap={4} wrap="nowrap">
        <Text c="orange.5" fw={500}>
          #{entryNumber}
        </Text>
        <IconFlag size={14} color="var(--mantine-color-orange-5)" />
      </Group>
    </Tooltip>
  );
}
