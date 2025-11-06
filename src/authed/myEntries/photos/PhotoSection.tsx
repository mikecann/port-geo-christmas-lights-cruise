import { Text } from "@mantine/core";
import { MAX_PHOTOS_PER_ENTRY } from "../../../../shared/constants";
import PhotoUpload from "./PhotoUpload";
import PhotoGallery from "./PhotoGallery";
import type { PhotoDoc } from "../../../../convex/features/photos/schema";

interface PhotoSectionProps {
  photos: PhotoDoc[];
  canUpload?: boolean;
  canRemove?: boolean;
  onUploadStateChange?: (isUploading: boolean) => void;
}

export default function PhotoSection({
  photos,
  canUpload = false,
  canRemove = false,
  onUploadStateChange,
}: PhotoSectionProps) {
  return (
    <div>
      <Text size="sm" fw={500}>
        Photos
      </Text>

      <Text size="sm" c="dimmed" mb="sm">
        Don't worry if you don't have any photos yet, you can add them later.
      </Text>

      {photos.length == 0 ? null : (
        <PhotoGallery
          photos={photos}
          canRemove={canRemove}
          emptyMessage="No photos uploaded yet. Add photos of your Christmas lights display!"
        />
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
