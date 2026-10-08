// Placeholder origin used only to resolve relative paths, never navigated to.
const base = "https://return-to.invalid";

const hasControlChars = (value: string) =>
  [...value].some((char) => char <= "\u001f" || char === "\u007f");

// Browsers ignore tabs and newlines in URLs and read "\" as "/", so
// "/\evil.com" or "/<tab>/evil.com" would leave the site like "//evil.com".
const isSamePath = (path: string) =>
  path.startsWith("/") &&
  !path.startsWith("//") &&
  !path.startsWith("/\\") &&
  !hasControlChars(path);

/**
 * Returns `returnTo` as a same-origin path such as "/map?x=1", or undefined
 * when it could send the browser anywhere else (javascript:, //evil.com,
 * https://evil.com and their percent-encoded forms).
 */
export const safeReturnTo = (
  returnTo: string | undefined,
): string | undefined => {
  if (!returnTo) return undefined;

  // Check each percent-decoded layer too, in case something decodes it again.
  let layer = returnTo;
  for (let depth = 0; depth < 5; depth++) {
    if (!isSamePath(layer)) return undefined;
    let decoded: string;
    try {
      decoded = decodeURIComponent(layer);
    } catch {
      return undefined;
    }
    if (decoded === layer) break;
    layer = decoded;
  }
  if (!isSamePath(layer)) return undefined;

  let url: URL;
  try {
    url = new URL(returnTo, base);
  } catch {
    return undefined;
  }
  if (url.origin !== base) return undefined;

  // Dot segments can still collapse to "//", e.g. "/.//evil.com".
  const path = url.pathname + url.search + url.hash;
  return isSamePath(path) ? path : undefined;
};
