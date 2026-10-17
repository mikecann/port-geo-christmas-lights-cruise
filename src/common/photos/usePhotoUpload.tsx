import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import type { FileRejection } from "@mantine/dropzone";
import type { Id } from "../../../convex/_generated/dataModel";
import { useErrorHandler } from "../errors";
import {
  MAX_IMAGE_DIMENSION,
  MAX_PHOTO_UPLOAD_BYTES,
} from "../../../shared/constants";
import { preparePhotoForUpload } from "./preparePhoto";

const compressToJpeg = (file: File) =>
  imageCompression(file, {
    maxWidthOrHeight: MAX_IMAGE_DIMENSION,
    maxSizeMB: MAX_PHOTO_UPLOAD_BYTES / 1024 / 1024,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.8,
  });

const showError = (title: string, message: string) =>
  notifications.show({
    title,
    message,
    color: "red",
    icon: <IconAlertCircle size={16} />,
  });

// Shrinks each photo to a JPEG and uploads it to Convex storage, for both
// entrants and admins. The caller supplies its own begin and save mutations.
export function usePhotoUpload({
  currentPhotoCount,
  maxPhotos,
  beginUpload,
  savePhoto,
  onUploadStateChange,
}: {
  currentPhotoCount: number;
  maxPhotos: number;
  beginUpload: () => Promise<{ uploadUrl: string; photoId: Id<"photos"> }>;
  savePhoto: (args: {
    photoId: Id<"photos">;
    storageId: Id<"_storage">;
  }) => Promise<{ error: string } | null>;
  onUploadStateChange?: (isUploading: boolean) => void;
}) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const onApiError = useErrorHandler();
  const isUploading = uploadingCount > 0;

  const uploadOne = async (original: File) => {
    const prepared = await preparePhotoForUpload(original, compressToJpeg);
    if ("error" in prepared) {
      showError("Photo not uploaded", prepared.error);
      return false;
    }

    try {
      const { uploadUrl, photoId } = await beginUpload();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": prepared.file.type },
        body: prepared.file,
      });
      if (!result.ok)
        throw new Error(`Upload failed with status ${result.status}`);

      const { storageId } = (await result.json()) as {
        storageId: Id<"_storage">;
      };
      const saveResult = await savePhoto({ photoId, storageId });
      if (saveResult) {
        showError("Photo not saved", saveResult.error);
        return false;
      }
      return true;
    } catch (error) {
      onApiError(error, "photo upload");
      return false;
    }
  };

  const uploadFiles = async (files: File[]) => {
    const allowedCount = maxPhotos - currentPhotoCount;
    if (files.length > allowedCount) {
      const ignoredCount = files.length - allowedCount;
      notifications.show({
        title: "Too many photos",
        message: `You can only upload ${allowedCount} more photo${allowedCount === 1 ? "" : "s"}. ${ignoredCount} file${ignoredCount === 1 ? "" : "s"} will be ignored.`,
        color: "orange",
        icon: <IconAlertCircle size={16} />,
      });
      files = files.slice(0, Math.max(allowedCount, 0));
    }
    if (files.length === 0) return;

    setUploadingCount(files.length);
    onUploadStateChange?.(true);

    let successCount = 0;
    for (const file of files) if (await uploadOne(file)) successCount++;

    setUploadingCount(0);
    onUploadStateChange?.(false);

    const failedCount = files.length - successCount;
    if (files.length > 1 && failedCount > 0)
      notifications.show({
        title: "Upload completed",
        message: `${successCount} photo${successCount === 1 ? "" : "s"} uploaded successfully, ${failedCount} failed`,
        color: "orange",
        icon: <IconAlertCircle size={16} />,
      });
  };

  const showRejections = (rejections: FileRejection[]) => {
    for (const { file } of rejections)
      showError(
        "Invalid file",
        `${file.name} isn't a JPEG, PNG or WebP photo under 10MB`,
      );
  };

  return { uploadFiles, showRejections, isUploading, uploadingCount };
}
