export type ImageSize = "xs" | "sm" | "md";

interface ImageOptions {
  size: ImageSize;
  quality?: number;
}

// Define size mappings for different use cases
const SIZE_MAPPINGS = {
  xs: { width: 150, quality: 80 }, // Small thumbnails, profile pictures
  sm: { width: 400, quality: 85 }, // Card previews, small gallery items
  md: { width: 800, quality: 90 }, // Medium displays, lightbox previews
} as const;

/**
 * Optimizes an image URL using Cloudflare R2's image resizing capabilities
 *
 * @param originalUrl - The original R2 image URL
 * @param options - Optimization options including size and quality
 * @returns Optimized image URL or original URL if optimization fails
 *
 * @example
 * ```ts
 * const optimizedUrl = optimizeImageUrl("https://pub-123.r2.dev/photos/image.jpg", { size: "sm" });
 * // Returns: "https://pub-123.r2.dev/cdn-cgi/image/width=400,quality=85/photos/image.jpg"
 * ```
 */
export function optimizeImageUrl(
  originalUrl: string | null | undefined,
  options: ImageOptions,
): string | null {
  // Return null if no URL provided
  if (!originalUrl) return null;

  try {
    const url = new URL(originalUrl);
    const sizeConfig = SIZE_MAPPINGS[options.size];

    if (!sizeConfig) return originalUrl;

    // Use provided quality or default from size config
    const quality = options.quality ?? sizeConfig.quality;

    // Extract the path (everything after the domain)
    const imagePath = url.pathname;

    // Check if this is a direct R2 URL - these don't support /cdn-cgi/image/
    if (
      url.hostname.includes("r2.dev") ||
      url.hostname.includes("r2.cloudflarestorage.com")
    )
      // Direct R2 URLs don't support Cloudflare's image resizing
      // Need to serve through custom domain with Cloudflare proxy
      return originalUrl;

    // Construct the optimized URL using Cloudflare's image resizing syntax
    // Format: https://domain.com/cdn-cgi/image/width=400,quality=85/path/to/image.jpg
    const optimizationParams = `width=${sizeConfig.width},quality=${quality}`;
    const optimizedUrl = `${url.origin}/cdn-cgi/image/${optimizationParams}${imagePath}`;

    return optimizedUrl;
  } catch (error) {
    console.warn("Failed to optimize image URL:", error);
    return originalUrl;
  }
}

/**
 * Hook-friendly wrapper for optimizeImageUrl that works with usePhotoUrl
 */
export function useOptimizedImageUrl(
  originalUrl: string | null | undefined,
  options: ImageOptions,
): string | null {
  return optimizeImageUrl(originalUrl, options);
}
