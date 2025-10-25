import { Modal, Stack, Textarea, Group, Button } from "@mantine/core";
import { useState } from "react";

interface RejectEntryModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  entryName: string;
  loading: boolean;
}

export default function RejectEntryModal({
  opened,
  onClose,
  onConfirm,
  entryName,
  loading,
}: RejectEntryModalProps) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setReason("");
        onClose();
      }}
      title="Reject Entry"
      centered
    >
      <Stack gap="md">
        <Textarea
          label="Rejection Reason"
          description={`Please provide a reason for rejecting "${entryName}"`}
          placeholder="e.g., Address is outside the cruise route area, photos do not show adequate lighting display, etc."
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          minRows={4}
          required
          autoFocus
        />

        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={() => {
              setReason("");
              onClose();
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              onConfirm(reason);
              setReason("");
            }}
            disabled={!reason.trim() || loading}
            loading={loading}
          >
            Reject Entry
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
