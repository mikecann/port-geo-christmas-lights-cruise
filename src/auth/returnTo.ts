// Placeholder origin used only to resolve relative paths, never navigated to.
const base = "https://return-to.invalid";

// Browsers drop tabs and newlines from URLs, so "/<tab>/evil.com" would act
// like "//evil.com".
const hasControlChars = (value: string) =>
  [...value].some((char) => char <= "\u001f" || char === "\u007f");

// Browsers read "\" as "/", so "/\evil.com" would leave the site just like
// "//evil.com".
const startsLikePath = (value: string) =>
  value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\");

// Resolves `value` against this site and returns its normalised path, or
// undefined if it would go anywhere else.
const sameSitePath = (value: string): string | undefined => {
  if (!startsLikePath(value)) return undefined;

  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return undefined;
  }
  if (url.origin !== base) return undefined;

  // Dot segments can still collapse to "//", e.g. "/.//evil.com".
  const path = url.pathname + url.search + url.hash;
  return startsLikePath(path) ? path : undefined;
};

// Decodes %XX escapes byte by byte and leaves a stray "%" alone, so it never
// throws. Not real UTF-8 decoding, but "/", "\" and the control characters
// are all single bytes, which is all the checks below care about.
const percentDecode = (value: string) =>
  value.replace(/%([0-9a-f]{2})/gi, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

/**
 * Returns `returnTo` as a same-origin path such as "/map?x=1", or undefined
 * when it could send the browser anywhere else (javascript:, //evil.com,
 * https://evil.com and their percent-encoded forms).
 */
export const safeReturnTo = (
  returnTo: string | undefined,
): string | undefined => {
  if (!returnTo || hasControlChars(returnTo)) return undefined;

  const path = sameSitePath(returnTo);
  if (path === undefined) return undefined;

  // In case something percent-decodes the path again before navigating
  // ("/%2Fevil.com" becomes "//evil.com"), its decoded forms have to stay on
  // the site too.
  let layer = path;
  for (let depth = 0; depth < 5; depth++) {
    const decoded = percentDecode(layer);
    if (decoded === layer) return path;
    if (sameSitePath(decoded) === undefined) return undefined;
    layer = decoded;
  }
  return undefined;
};
