import type { PhotoDoc } from "../../../convex/features/photos/schema";
import { exhaustiveCheck } from "../../../shared/misc";
import type { ImageSize } from "../utils/imageOptimization";

// Re-export for convenience
export type { ImageSize };

interface UsePhotoUrlOptions {
  size?: ImageSize;
  quality?: number;
}

/**
 * Get optimized photo URL from stored photo data
 * Note: Despite the name "use", this is no longer a hook since we store URLs directly
 * @param photo - The photo object (discriminated union)
 * @param options - Optional configuration for image optimization
 * @returns The optimized photo URL or null if not available
 */
export function usePhotoUrl(
  photo: PhotoDoc | null | undefined,
  options: UsePhotoUrlOptions = {},
): string | null {
  // Handle null/undefined
  if (!photo) return null;

  // Handle mock photos - return local path
  if (photo.kind === "mock") return `/mockPhotos/${photo.mockPath}`;

  // Handle Convex-stored photos
  if (photo.kind === "convex_stored") {
    // Return null for photos that are still uploading
    if (photo.uploadState.status === "uploading") return null;
    if (photo.uploadState.status === "uploaded") {
      // Default to "md" size if not specified
      const size = options.size ?? "md";
      const qualityOverride = options.quality;

      // Map sizes to sensible defaults
      const sizeMappings: Record<
        ImageSize,
        { width: number; quality: number }
      > = {
        xs: { width: 150, quality: 80 },
        sm: { width: 400, quality: 85 },
        md: { width: 800, quality: 90 },
      };
      const { width, quality } = sizeMappings[size];
      const dpr =
        typeof window === "undefined"
          ? 1
          : Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

      const q = qualityOverride ?? quality;

      // Use Cloudflare's URL-based image transformation
      // Format: https://ZONE/cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>
      const transformOptions = `width=${width},quality=${q},format=auto,dpr=${dpr},fit=cover`;
      return `https://portgeochristmascruise.com.au/cdn-cgi/image/${transformOptions}/${photo.uploadState.url}`;
    }

    exhaustiveCheck(photo.uploadState);
  }

  exhaustiveCheck(photo);
}
