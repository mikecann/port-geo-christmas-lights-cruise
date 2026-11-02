import { Text } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import "@mantine/dropzone/styles.css";
import { ALLOWED_PHOTO_CONTENT_TYPES } from "../../../shared/constants";
import DropzoneContent from "./DropzoneContent";
import { MAX_ORIGINAL_PHOTO_BYTES } from "./preparePhoto";
import { usePhotoUpload } from "./usePhotoUpload";

type PhotoDropzoneProps = Parameters<typeof usePhotoUpload>[0];

// Everything is converted to a JPEG before upload. Browsers that can't decode
// HEIC, AVIF or GIF get a clear message from preparePhotoForUpload instead.
const ACCEPTED_TYPES = [
  ...ALLOWED_PHOTO_CONTENT_TYPES,
  MIME_TYPES.heic,
  MIME_TYPES.heif,
  MIME_TYPES.avif,
  MIME_TYPES.gif,
];

export default function PhotoDropzone(props: PhotoDropzoneProps) {
  const { currentPhotoCount, maxPhotos } = props;
  const { uploadFiles, showRejections, isUploading, uploadingCount } =
    usePhotoUpload(props);
  const isAtLimit = currentPhotoCount >= maxPhotos;

  if (isAtLimit && !isUploading)
    return (
      <Text size="sm" c="dimmed">
        That's the most photos an entry can have ({maxPhotos}). Remove one to
        add another.
      </Text>
    );

  // The tiles above already show how many there are, so no count here
  return (
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
  );
}
