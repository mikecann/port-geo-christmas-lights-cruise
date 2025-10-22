import { Modal, Stack } from "@mantine/core";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import PhotoLightbox from "../../../myEntries/photos/PhotoLightbox";
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
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");

  if (!entry) return null;

  return (
    <>
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
          <EntryPhotosSection
            entry={entry}
            onImageClick={(imageUrl: string) => {
              setSelectedImageUrl(imageUrl);
              setLightboxOpened(true);
            }}
          />
        </Stack>
      </Modal>

      <PhotoLightbox
        opened={lightboxOpened}
        onClose={() => setLightboxOpened(false)}
        imageUrl={selectedImageUrl}
      />
    </>
  );
}
