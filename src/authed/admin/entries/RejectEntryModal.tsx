import {
  Modal,
  Stack,
  Textarea,
  Group,
  Button,
  Chip,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { MAX_REJECTED_REASON_LENGTH } from "../../../../shared/constants";

// Ready-made reasons. Picking one fills in the message, which can then be
// changed. The rejection email already asks them to reply with questions.
const REASONS = [
  {
    label: "Not on the cruise route",
    text: "Your house isn't on the canals the cruise goes through, so people on the boat wouldn't be able to see your display.",
  },
  {
    label: "Already entered",
    text: "There's already an entry for this address this year.",
  },
  {
    label: "Photos don't show the lights",
    text: "Your photos don't show your Christmas lights. Please reply to this email with a photo of your display and we'll take another look.",
  },
  {
    label: "Name not suitable",
    text: "Your entry name isn't suitable for a family event. Please reply to this email with a new name and we'll take another look.",
  },
];

export default function RejectEntryModal({
  opened,
  onClose,
  onConfirm,
  entryName,
  loading,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  entryName: string;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setReason("");
        onClose();
      }}
      title={`Reject "${entryName}"?`}
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          The entrant gets an email with your reason. Pick one below or write
          your own.
        </Text>
        <Group gap="xs">
          {REASONS.map((preset) => (
            <Chip
              key={preset.label}
              size="sm"
              checked={reason === preset.text}
              onChange={() => setReason(preset.text)}
            >
              {preset.label}
            </Chip>
          ))}
        </Group>
        <Textarea
          label="Reason"
          placeholder="Tell them why their entry wasn't approved"
          value={reason}
          maxLength={MAX_REJECTED_REASON_LENGTH}
          onChange={(e) => setReason(e.currentTarget.value)}
          autosize
          minRows={3}
          required
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
            Reject and email them
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
