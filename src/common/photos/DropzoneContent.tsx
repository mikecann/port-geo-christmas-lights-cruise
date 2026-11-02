import { Group, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useMediaQuery } from "@mantine/hooks";
import { IconUpload, IconX, IconPhotoPlus } from "@tabler/icons-react";

interface DropzoneContentProps {
  isUploading: boolean;
  uploadingCount: number;
  remainingPhotos: number;
}

// Most people add photos from a phone, so it says tap there. With a mouse
// (admins on a computer, mostly) it says click or drop instead.
export default function DropzoneContent({
  isUploading,
  uploadingCount,
  remainingPhotos,
}: DropzoneContentProps) {
  const hasMouse = useMediaQuery("(hover: hover) and (pointer: fine)");
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
          : `${hasMouse ? "Click or drop photos here" : "Tap to add photos"} (up to ${remainingPhotos})`}
      </Text>
    </Group>
  );
}
