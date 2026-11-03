// The build's hashed files all live under /assets/. A request for one that
// isn't there (an old build's file, asked for by a tab opened before a deploy)
// would otherwise get the SPA fallback: index.html with a 200 and, from
// public/_headers, a year-long immutable cache. The browser can't run that as
// a script or stylesheet, so a plain 404 is more honest and never cached.
export function notFoundForMissingAsset(
  pathname: string,
  response: Response,
): Response {
  if (!pathname.startsWith("/assets/")) return response;
  if (!response.headers.get("content-type")?.startsWith("text/html"))
    return response;
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
