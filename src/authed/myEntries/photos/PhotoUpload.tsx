import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MAX_PHOTOS_PER_ENTRY } from "../../../../shared/constants";
import PhotoDropzone from "../../../common/photos/PhotoDropzone";

interface PhotoUploadProps {
  currentPhotoCount: number;
  maxPhotos?: number;
  onUploadStateChange?: (isUploading: boolean) => void;
}

export default function PhotoUpload({
  currentPhotoCount,
  maxPhotos = MAX_PHOTOS_PER_ENTRY,
  onUploadStateChange,
}: PhotoUploadProps) {
  const beginUpload = useMutation(api.my.photos.beginUpload);
  const savePhoto = useMutation(api.my.photos.save);

  return (
    <PhotoDropzone
      currentPhotoCount={currentPhotoCount}
      maxPhotos={maxPhotos}
      beginUpload={() => beginUpload()}
      savePhoto={savePhoto}
      onUploadStateChange={onUploadStateChange}
    />
  );
}
