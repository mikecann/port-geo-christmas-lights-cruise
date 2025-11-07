import { Modal, Stack, Text } from "@mantine/core";

interface EntryNameGuidelinesModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function EntryNameGuidelinesModal({
  opened,
  onClose,
}: EntryNameGuidelinesModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Entry Name Guidelines"
      centered
    >
      <Stack gap="md">
        <Text size="sm">
          New this year! Our website now includes an interactive map to help
          voters easily view and locate their favourite displays to vote.
        </Text>
        <Text size="sm">
          Each entry is shown by its entrant number and entry name only.
        </Text>
        <Text size="sm">
          Please avoid using your full name or home address as your entry name -
          instead, give your display a fun, festive title.
        </Text>
      </Stack>
    </Modal>
  );
}
