// Photos are resized by Cloudflare on the site's zone. Asking for a few fixed
// widths (never width times a fractional dpr) keeps the number of variants
// small, so most requests hit Cloudflare's cache.
const IMAGE_ZONE = "https://portgeochristmascruise.com.au";

export const DEFAULT_PHOTO_QUALITY = 75;

export function resizedPhotoUrl(
  sourceUrl: string,
  width: number,
  quality = DEFAULT_PHOTO_QUALITY,
) {
  return `${IMAGE_ZONE}/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down/${sourceUrl}`;
}

export function resizedPhotoSrcSet(
  sourceUrl: string,
  widths: ReadonlyArray<number>,
  quality = DEFAULT_PHOTO_QUALITY,
) {
  return widths
    .map((width) => `${resizedPhotoUrl(sourceUrl, width, quality)} ${width}w`)
    .join(", ");
}

// The entry page carousel. The worker preloads the same srcset and sizes, so
// the browser picks the same file for the preload and the <img>.
export const ENTRY_PHOTO = {
  widths: [480, 780, 1200],
  // Container size="lg" is 71.25em wide
  sizes: "(max-width: 71.25em) 100vw, 1140px",
  fallbackWidth: 780,
  // The loading skeleton uses the same ratio, so the page doesn't jump
  aspectRatio: 16 / 10,
} as const;
