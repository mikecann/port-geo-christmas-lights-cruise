import { Modal, Stack } from "@mantine/core";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import EntryPhotosSection from "./EntryPhotosSection";
import EntryInformationSection from "./EntryInformationSection";
import UserDetailsSection from "./UserDetailsSection";

interface EntryDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  entry: Doc<"entries"> | null;
}

export default function EntryDetailsModal({
  opened,
  onClose,
  entry,
}: EntryDetailsModalProps) {
  if (!entry) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Entry Details"
      size="lg"
      centered
    >
      <Stack gap="lg">
        <EntryInformationSection entry={entry} />
        <UserDetailsSection userId={entry.submittedByUserId} />
        <EntryPhotosSection entry={entry} />
      </Stack>
    </Modal>
  );
}
