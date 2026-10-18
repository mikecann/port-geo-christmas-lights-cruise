/// <reference types="@cloudflare/workers-types" />

import { entryIdFromPath, loadEntryOg, maybeInjectOg } from "./og";
import { withSecurityHeaders } from "./securityHeaders";

export interface Env {
  ASSETS: Fetcher;
  CONVEX_SITE_URL?: string;
}

// With compatibility_date before 2025-04-01, requests that don't match a file
// (like /entries/<id>) run this worker before the SPA fallback. Moving the date
// past that would serve those pages straight from assets, so it would need
// assets.run_worker_first for /entries/* to keep the OG tags.
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const entryId =
      request.method === "GET" ? entryIdFromPath(url.pathname) : null;

    // Start the OG lookup alongside the asset fetch rather than after it
    const og =
      entryId && env.CONVEX_SITE_URL
        ? loadEntryOg({
            env,
            ctx,
            entryId,
            // The app tsconfig's DOM types don't know Workers' caches.default
            cache: (caches as unknown as { default: Cache }).default,
            cacheKey: new URL(`/__og/entries/${entryId}`, url).href,
          })
        : null;

    const originResponse = env.ASSETS
      ? await env.ASSETS.fetch(request)
      : await fetch(request);

    const response = await maybeInjectOg(request, originResponse, og);

    return withSecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;
