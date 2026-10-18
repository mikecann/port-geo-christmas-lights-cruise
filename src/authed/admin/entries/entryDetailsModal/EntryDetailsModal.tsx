import { Card, Modal, Stack } from "@mantine/core";
import type { AdminEntry } from "../../../../../convex/admin/competition/entries";
import EntryPhotosSection from "./EntryPhotosSection";
import EntryNumberSection from "../EntryNumberSection";
import EntryInformationSection from "./EntryInformationSection";
import UserDetailsSection from "./UserDetailsSection";

interface EntryDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  entry: AdminEntry | null;
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
        <Card withBorder p="md">
          <EntryNumberSection
            key={`${entry._id}-${entry.entryNumber}`}
            entry={entry}
          />
        </Card>
        <UserDetailsSection userId={entry.submittedByUserId} />
        <EntryPhotosSection entry={entry} />
      </Stack>
    </Modal>
  );
}
