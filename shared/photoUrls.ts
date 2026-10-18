// Photos are resized by Cloudflare on the site's zone. Asking for a few fixed
// widths (never width times a fractional dpr) keeps the number of variants
// small, so most requests hit Cloudflare's cache.
const IMAGE_ZONE = "https://portgeochristmascruise.com.au";

// Off while Cloudflare's allowed image sources only list the old US Convex
// deployment: resizing a Sydney storage URL returns 403. Turn back on once
// shocking-robin-810.ap-southeast-2.convex.cloud is an allowed source.
export const PHOTO_RESIZING_ENABLED = false;

export const DEFAULT_PHOTO_QUALITY = 75;

export function resizedPhotoUrl(
  sourceUrl: string,
  width: number,
  quality = DEFAULT_PHOTO_QUALITY,
) {
  if (!PHOTO_RESIZING_ENABLED) return sourceUrl;
  return `${IMAGE_ZONE}/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down/${sourceUrl}`;
}

export function resizedPhotoSrcSet(
  sourceUrl: string,
  widths: ReadonlyArray<number>,
  quality = DEFAULT_PHOTO_QUALITY,
) {
  if (!PHOTO_RESIZING_ENABLED) return sourceUrl;
  return widths
    .map((width) => `${resizedPhotoUrl(sourceUrl, width, quality)} ${width}w`)
    .join(", ");
}

// The entry page carousel. The worker preloads the same srcset and sizes, so
// the browser picks the same file for the preload and the <img>.
export const ENTRY_PHOTO = {
  // Uploads are at most 1600px, so 1600 is the full-size photo
  widths: [480, 780, 1200, 1600],
  // Container size="lg" is 71.25em wide
  sizes: "(max-width: 71.25em) 100vw, 1140px",
  fallbackWidth: 780,
  // The loading skeleton uses the same ratio, so the page doesn't jump
  aspectRatio: 16 / 10,
} as const;

// The vote page's full-screen photo, small for patchy mobile data on the boat.
// The page is at most 36em wide, and the worker preloads this too.
export const VOTE_PHOTO = {
  widths: [480, 780],
  sizes: "(max-width: 36em) 100vw, 576px",
  fallbackWidth: 480,
} as const;
