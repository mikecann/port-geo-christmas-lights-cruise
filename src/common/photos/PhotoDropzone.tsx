import { Text, Stack } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "../../../shared/constants";
import DropzoneContent from "./DropzoneContent";
import { MAX_ORIGINAL_PHOTO_BYTES } from "./preparePhoto";
import { usePhotoUpload } from "./usePhotoUpload";

type PhotoDropzoneProps = Parameters<typeof usePhotoUpload>[0];

// Only types every browser can decode, so the JPEG conversion always works.
// Leaving HEIC out also makes iPhones hand over a JPEG copy.
const ACCEPTED_TYPES = ALLOWED_PHOTO_CONTENT_TYPES;

export default function PhotoDropzone(props: PhotoDropzoneProps) {
  const { currentPhotoCount, maxPhotos } = props;
  const { uploadFiles, showRejections, isUploading, uploadingCount } =
    usePhotoUpload(props);
  const isAtLimit = currentPhotoCount >= maxPhotos;

  if (isAtLimit && !isUploading)
    return (
      <Text size="sm" c="dimmed" ta="center" p="md">
        Maximum number of photos reached ({maxPhotos}/{maxPhotos})
      </Text>
    );

  return (
    <Stack gap="md">
      <Dropzone
        onDrop={(files) => void uploadFiles(files)}
        onReject={showRejections}
        maxSize={MAX_ORIGINAL_PHOTO_BYTES}
        accept={ACCEPTED_TYPES}
        disabled={isUploading || isAtLimit}
        loading={isUploading}
      >
        <DropzoneContent
          isUploading={isUploading}
          uploadingCount={uploadingCount}
          remainingPhotos={maxPhotos - currentPhotoCount}
        />
      </Dropzone>

      {currentPhotoCount > 0 && !isUploading && (
        <Text size="xs" c="dimmed" ta="center">
          {currentPhotoCount}/{maxPhotos} photos uploaded
        </Text>
      )}
    </Stack>
  );
}
