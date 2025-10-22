import { Modal, Stack, Text, NumberInput, Group, Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useErrorCatchingMutation } from "../../../common/errors";
import { api } from "../../../../convex/_generated/api";

interface MockDataModalProps {
  opened: boolean;
  onClose: () => void;
  entryCount: number;
  setEntryCount: (count: number) => void;
}

export default function MockDataModal({
  opened,
  onClose,
  entryCount,
  setEntryCount,
}: MockDataModalProps) {
  const [generateMockEntries] = useErrorCatchingMutation(
    api.admin.system.entries.generateMock,
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Generate Mock Entries"
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          This will create mock approved entries with random data and photos for
          testing and demonstration purposes. Each entry will have 1-4 random
          photos.
        </Text>

        <NumberInput
          label="Number of entries to generate"
          description="How many mock entries should be created?"
          value={entryCount}
          onChange={(value) =>
            setEntryCount(typeof value === "number" ? value : 10)
          }
          min={1}
          max={100}
          step={1}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              generateMockEntries({
                count: entryCount,
              });
              onClose();
            }}
            leftSection={<IconPlus size={16} />}
            color="blue"
          >
            Generate {entryCount} Entries
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
