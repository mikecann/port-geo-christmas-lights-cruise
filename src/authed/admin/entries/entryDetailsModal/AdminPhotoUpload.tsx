import { Text, Stack } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useMutation } from "convex/react";
import imageCompression from "browser-image-compression";
import { api } from "../../../../../convex/_generated/api";
import { useApiErrorHandler } from "../../../../common/errors";
import {
  MAX_PHOTOS_PER_ENTRY,
  MAX_IMAGE_DIMENSION,
} from "../../../../../shared/constants";
import type { Id } from "../../../../../convex/_generated/dataModel";
import DropzoneContent from "../../../myEntries/photos/DropzoneContent";

const ALLOWED_IMAGE_TYPES = [
  MIME_TYPES.png,
  MIME_TYPES.jpeg,
  MIME_TYPES.gif,
  MIME_TYPES.webp,
  MIME_TYPES.avif,
  MIME_TYPES.heic,
  MIME_TYPES.heif,
];

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
        fileType: "image/jpeg",
        initialQuality: 0.8,
      });
      return compressedFile;
    } catch (error) {
      console.error("Image compression failed:", error);
      return file;
    }
  };

  const handleFileUpload = async (file: File) => {
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
      const compressedFile = await compressImage(file);
      const { uploadUrl, photoId } = await beginUpload({ entryId });

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

          let successCount = 0;
          let failedCount = 0;

          for (const file of files) {
            const success = await handleFileUpload(file);
            if (success) successCount++;
            else failedCount++;
          }

          setIsUploading(false);
          setUploadingCount(0);

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
        maxSize={10 * 1024 * 1024}
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
