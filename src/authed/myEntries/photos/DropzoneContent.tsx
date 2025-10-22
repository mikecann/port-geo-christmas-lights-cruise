import { Group, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconUpload, IconX, IconPhoto } from "@tabler/icons-react";

interface DropzoneContentProps {
  isUploading: boolean;
  uploadingCount: number;
  remainingPhotos: number;
}

export default function DropzoneContent({
  isUploading,
  uploadingCount,
  remainingPhotos,
}: DropzoneContentProps) {
  return (
    <Group
      justify="center"
      gap="xl"
      mih={120}
      style={{ pointerEvents: "none" }}
    >
      <Dropzone.Accept>
        <IconUpload
          size={50}
          color="var(--mantine-color-blue-6)"
          stroke={1.5}
        />
      </Dropzone.Accept>
      <Dropzone.Reject>
        <IconX size={50} color="var(--mantine-color-red-6)" stroke={1.5} />
      </Dropzone.Reject>
      <Dropzone.Idle>
        <IconPhoto size={50} color="var(--mantine-color-dimmed)" stroke={1.5} />
      </Dropzone.Idle>

      <div>
        <Text size="lg" inline>
          {isUploading
            ? `Uploading ${uploadingCount} photo${uploadingCount === 1 ? "" : "s"}...`
            : "Drag photos here or click to select"}
        </Text>
        <Text size="sm" c="dimmed" inline mt={7}>
          {isUploading
            ? "Please wait while your photos are being resized and uploaded"
            : `${remainingPhotos} photo${remainingPhotos === 1 ? "" : "s"} remaining`}
        </Text>
      </div>
    </Group>
  );
}
