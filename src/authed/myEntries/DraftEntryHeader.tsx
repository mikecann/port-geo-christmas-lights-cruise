import { Group, Stack, Text, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { Doc } from "../../../convex/_generated/dataModel";

interface DraftEntryHeaderProps {
  entry: Doc<"entries">;
  isSaving: boolean;
  onRemove: () => void;
}

export default function DraftEntryHeader({
  entry,
  isSaving,
  onRemove,
}: DraftEntryHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start">
      <Stack gap={4} style={{ flex: 1 }}>
        <Text fw={500} size="lg">
          Your Competition Entry
        </Text>
        <Text size="sm" c="dimmed">
          Created {new Date(entry._creationTime).toLocaleDateString()}
        </Text>
      </Stack>
      <Group gap="xs">
        {isSaving && (
          <Badge color="yellow" variant="transparent">
            💾
          </Badge>
        )}
        <Badge color="blue" variant="light">
          Draft
        </Badge>
        <Tooltip label="Remove entry">
          <ActionIcon variant="light" color="red" onClick={onRemove}>
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
