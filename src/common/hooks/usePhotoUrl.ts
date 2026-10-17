import type {
  PhotoDoc,
  PublicPhoto,
} from "../../../convex/features/photos/schema";
import { exhaustiveCheck, iife } from "../../../shared/misc";
import { resizedPhotoSrcSet, resizedPhotoUrl } from "../../../shared/photoUrls";

export type ImageSize = "xs" | "sm" | "md" | "lg";

// Fixed widths, roughly 2x the largest place each size is shown
const SIZE_WIDTHS: Record<ImageSize, number> = {
  xs: 128, // map markers and small thumbnails
  sm: 480,
  md: 780,
  lg: 1200, // lightbox
};

type Photo = PhotoDoc | PublicPhoto | null | undefined;

// The uploaded photo's URL, or a local path for mock photos
function sourceOf(photo: Photo) {
  if (!photo) return null;
  if (photo.kind === "mock")
    return { url: `/mockPhotos/${photo.mockPath}`, isMock: true };

  // Public photos carry their URL directly; stored docs keep it in uploadState
  const url = iife(() => {
    if ("url" in photo) return photo.url;
    // Return null for photos that are still uploading
    if (photo.uploadState.status === "uploading") return null;
    if (photo.uploadState.status === "uploaded") return photo.uploadState.url;
    exhaustiveCheck(photo.uploadState);
  });
  return url ? { url, isMock: false } : null;
}

/**
 * Get a resized photo URL from stored photo data
 * Note: Despite the name "use", this is not a hook since we store URLs directly
 */
export function usePhotoUrl(
  photo: Photo,
  options: { size?: ImageSize; quality?: number } = {},
): string | null {
  const source = sourceOf(photo);
  if (!source) return null;
  if (source.isMock) return source.url;
  return resizedPhotoUrl(
    source.url,
    SIZE_WIDTHS[options.size ?? "md"],
    options.quality,
  );
}

/**
 * Get src, srcSet and sizes for an <img> that picks a width to suit the screen
 */
export function usePhotoSrcSet(
  photo: Photo,
  options: {
    widths: ReadonlyArray<number>;
    sizes: string;
    fallbackWidth: number;
    quality?: number;
  },
): { src: string; srcSet?: string; sizes?: string } | null {
  const source = sourceOf(photo);
  if (!source) return null;
  if (source.isMock) return { src: source.url };
  return {
    src: resizedPhotoUrl(source.url, options.fallbackWidth, options.quality),
    srcSet: resizedPhotoSrcSet(source.url, options.widths, options.quality),
    sizes: options.sizes,
  };
}
