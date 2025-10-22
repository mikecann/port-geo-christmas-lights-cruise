import { Text, Stack } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import imageCompression from "browser-image-compression";
import { api } from "../../../../convex/_generated/api";
import { useApiErrorHandler } from "../../../common/errors";
import {
  MAX_PHOTOS_PER_ENTRY,
  MAX_IMAGE_DIMENSION,
} from "../../../../shared/constants";
import type { Id } from "../../../../convex/_generated/dataModel";
import DropzoneContent from "./DropzoneContent";
import { beginUpload } from "../../../../convex/my/photos";

// Common image MIME types (excluding SVG for security reasons)
const ALLOWED_IMAGE_TYPES = [
  MIME_TYPES.png,
  MIME_TYPES.jpeg,
  MIME_TYPES.gif,
  MIME_TYPES.webp,
  MIME_TYPES.avif,
  MIME_TYPES.heic, // Apple iOS photos
  MIME_TYPES.heif, // Apple iOS photos
];

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const onApiError = useApiErrorHandler();

  const isAtLimit = currentPhotoCount >= maxPhotos;
  const remainingPhotos = maxPhotos - currentPhotoCount;

  const compressImage = async (file: File): Promise<File> => {
    try {
      const compressedFile = await imageCompression(file, {
        maxWidthOrHeight: MAX_IMAGE_DIMENSION,
        useWebWorker: true,
        fileType: "image/jpeg", // Always convert to JPEG for consistency, better compression, and universal support
        initialQuality: 0.8,
      });

      return compressedFile;
    } catch (error) {
      console.error("Image compression failed:", error);
      // If compression fails, return original file
      return file;
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file size (10MB limit for original file)
    if (file.size > 10 * 1024 * 1024) {
      notifications.show({
        title: "File too large",
        message: `${file.name} is larger than 10MB`,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
      return false;
    }

    try {
      // Step 1: Compress/resize the image
      const compressedFile = await compressImage(file);

      // Step 2: Get upload URL from server and create photo in "uploading" state
      const { uploadUrl, photoId } = await beginUpload();

      // Step 3: Upload file directly to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      if (!result.ok)
        throw new Error(`Upload failed with status ${result.status}`);

      const { storageId } = (await result.json()) as {
        storageId: Id<"_storage">;
      };

      // Step 4: Update the photo to "uploaded" state with the storage ID
      await savePhoto({ photoId, storageId });

      return true;
    } catch (error) {
      console.error("Upload failed:", error);
      onApiError(error);
      return false;
    }
  };

  if (isAtLimit && !isUploading)
    return (
      <Text size="sm" c="dimmed" ta="center" p="md">
        Maximum number of photos reached ({maxPhotos}/{maxPhotos})
      </Text>
    );

  return (
    <Stack gap="md">
      <Dropzone
        onDrop={async (files) => {
          if (files.length === 0) return;

          if (currentPhotoCount + files.length > maxPhotos) {
            const allowedFiles = maxPhotos - currentPhotoCount;
            notifications.show({
              title: "Too many photos",
              message: `You can only upload ${allowedFiles} more photo${allowedFiles === 1 ? "" : "s"}. ${files.length - allowedFiles} file${files.length - allowedFiles === 1 ? "" : "s"} will be ignored.`,
              color: "orange",
              icon: <IconAlertCircle size={16} />,
            });
            files = files.slice(0, allowedFiles);
          }

          if (files.length === 0) return;

          setIsUploading(true);
          setUploadingCount(files.length);
          onUploadStateChange?.(true);

          let successCount = 0;
          let failedCount = 0;

          for (const file of files) {
            const success = await handleFileUpload(file);
            if (success) successCount++;
            else failedCount++;
          }

          setIsUploading(false);
          setUploadingCount(0);
          onUploadStateChange?.(false);

          if (files.length > 1 && failedCount > 0)
            notifications.show({
              title: "Upload completed",
              message: `${successCount} photo${successCount === 1 ? "" : "s"} uploaded successfully${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
              color: failedCount > 0 ? "orange" : "green",
              icon: <IconAlertCircle size={16} />,
            });
        }}
        onReject={(files) => {
          files.forEach((file) => {
            notifications.show({
              title: "Invalid file",
              message: `${file.file.name} is not a supported image format or exceeds size limit`,
              color: "red",
              icon: <IconAlertCircle size={16} />,
            });
          });
        }}
        maxSize={10 * 1024 * 1024} // 10MB
        accept={ALLOWED_IMAGE_TYPES}
        disabled={isUploading || isAtLimit}
        loading={isUploading}
      >
        <DropzoneContent
          isUploading={isUploading}
          uploadingCount={uploadingCount}
          remainingPhotos={remainingPhotos}
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
