import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  MAX_PHOTO_UPLOAD_BYTES,
} from "../../../shared/constants";

// The largest photo we'll try to shrink. Phone photos are well under this.
export const MAX_ORIGINAL_PHOTO_BYTES = 10 * 1024 * 1024;

export type PreparedPhoto = { file: File } | { error: string };

// Every photo is re-encoded as a JPEG before upload. Only send the result if
// it's something the server will keep, or the original if conversion failed
// but the server would keep that.
export async function preparePhotoForUpload(
  original: File,
  compressToJpeg: (file: File) => Promise<File>,
): Promise<PreparedPhoto> {
  if (original.size > MAX_ORIGINAL_PHOTO_BYTES)
    return { error: `${original.name} is larger than 10MB.` };

  let file: File;
  try {
    file = await compressToJpeg(original);
  } catch (error) {
    console.error("Image compression failed:", error);
    // The server checks the original again, so it's safe to send as is
    if (
      ALLOWED_PHOTO_CONTENT_TYPES.includes(original.type) &&
      original.size <= MAX_PHOTO_UPLOAD_BYTES
    )
      return { file: original };
    return {
      error: `We couldn't read ${original.name}. Please choose a JPEG, PNG or WebP photo.`,
    };
  }

  if (!ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type))
    return {
      error: `We couldn't convert ${original.name} to a JPEG. Please choose a JPEG, PNG or WebP photo.`,
    };
  if (file.size > MAX_PHOTO_UPLOAD_BYTES)
    return {
      error: `${original.name} is still over 5 MB after resizing. Please choose a smaller photo.`,
    };

  return { file };
}
