import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MAX_PHOTOS_PER_ENTRY } from "../../../../../shared/constants";
import type { Id } from "../../../../../convex/_generated/dataModel";
import PhotoDropzone from "../../../../common/photos/PhotoDropzone";

interface AdminPhotoUploadProps {
  entryId: Id<"entries">;
  currentPhotoCount: number;
  maxPhotos?: number;
}

export default function AdminPhotoUpload({
  entryId,
  currentPhotoCount,
  maxPhotos = MAX_PHOTOS_PER_ENTRY,
}: AdminPhotoUploadProps) {
  const beginUpload = useMutation(api.admin.competition.photos.beginUpload);
  const savePhoto = useMutation(api.admin.competition.photos.save);

  return (
    <PhotoDropzone
      currentPhotoCount={currentPhotoCount}
      maxPhotos={maxPhotos}
      beginUpload={() => beginUpload({ entryId })}
      savePhoto={savePhoto}
    />
  );
}
