import { useState } from "react";
import { Button, Checkbox, Group, Modal, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { EntryWarning } from "./checkLines";

// Approve with warnings on the entry: each one has to be ticked before it goes
// through, so a clash (two entries for one house, last year's number gone)
// can't be approved by a quick tap
export default function ApproveWarningsModal({
  opened,
  onClose,
  onConfirm,
  entryName,
  warnings,
  loading,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryName: string;
  warnings: EntryWarning[];
  loading: boolean;
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const allTicked = warnings.every((warning) => ticked.has(warning.key));

  const toggle = (key: string, checked: boolean) =>
    setTicked((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });

  // Start fresh next time, so a reviewer looks at each warning again
  const close = () => {
    setTicked(new Set());
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={`Approve "${entryName}"?`}
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {warnings.length === 1
            ? "There's something to check first. Tick it once you have."
            : `There are ${warnings.length} things to check first. Tick each one once you have.`}
        </Text>
        <Stack gap="sm">
          {warnings.map((warning) => (
            <Checkbox
              key={warning.key}
              color="orange"
              checked={ticked.has(warning.key)}
              onChange={(event) =>
                toggle(warning.key, event.currentTarget.checked)
              }
              label={warning.content}
            />
          ))}
        </Stack>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            color="green"
            leftSection={<IconCheck size={18} />}
            onClick={onConfirm}
            disabled={!allTicked}
            loading={loading}
          >
            Approve
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
