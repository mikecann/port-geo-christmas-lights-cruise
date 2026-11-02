import { Box, Text } from "@mantine/core";
import { MAX_PHOTOS_PER_ENTRY } from "../../../../shared/constants";
import PhotoUpload from "./PhotoUpload";
import PhotoGallery from "./PhotoGallery";
import type { PhotoDoc } from "../../../../convex/features/photos/schema";

interface PhotoSectionProps {
  photos: PhotoDoc[];
  canUpload?: boolean;
  canRemove?: boolean;
  // Only a draft can be sent in without photos, so only it says so
  showAddLaterHint?: boolean;
  onUploadStateChange?: (isUploading: boolean) => void;
}

export default function PhotoSection({
  photos,
  canUpload = false,
  canRemove = false,
  showAddLaterHint = false,
  onUploadStateChange,
}: PhotoSectionProps) {
  return (
    <div>
      <Text size="sm" fw={500} mb={showAddLaterHint ? 0 : "xs"}>
        Photos
      </Text>

      {showAddLaterHint && (
        <Text size="sm" c="dimmed" mb="sm">
          No photos yet? You can add them once your entry is approved.
        </Text>
      )}

      {photos.length == 0 ? null : (
        <Box mb="sm">
          <PhotoGallery photos={photos} canRemove={canRemove} />
        </Box>
      )}

      {canUpload && (
        <PhotoUpload
          currentPhotoCount={photos.length}
          maxPhotos={MAX_PHOTOS_PER_ENTRY}
          onUploadStateChange={onUploadStateChange}
        />
      )}
    </div>
  );
}
