import { Group, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconUpload, IconX, IconPhotoPlus } from "@tabler/icons-react";

interface DropzoneContentProps {
  isUploading: boolean;
  uploadingCount: number;
  remainingPhotos: number;
}

// Most people add photos from a phone, so it says tap. Dragging still works
// on a computer without needing to be spelled out.
export default function DropzoneContent({
  isUploading,
  uploadingCount,
  remainingPhotos,
}: DropzoneContentProps) {
  return (
    <Group
      justify="center"
      gap="sm"
      mih={72}
      wrap="nowrap"
      style={{ pointerEvents: "none" }}
    >
      <Dropzone.Accept>
        <IconUpload
          size={28}
          color="var(--mantine-color-blue-6)"
          stroke={1.5}
        />
      </Dropzone.Accept>
      <Dropzone.Reject>
        <IconX size={28} color="var(--mantine-color-red-6)" stroke={1.5} />
      </Dropzone.Reject>
      <Dropzone.Idle>
        <IconPhotoPlus
          size={28}
          color="var(--mantine-color-dimmed)"
          stroke={1.5}
        />
      </Dropzone.Idle>

      <Text size="sm">
        {isUploading
          ? `Uploading ${uploadingCount} photo${uploadingCount === 1 ? "" : "s"}…`
          : `Tap to add photos (up to ${remainingPhotos})`}
      </Text>
    </Group>
  );
}
