/// <reference types="@cloudflare/workers-types" />

import {
  entryLookupFromPath,
  loadEntryOg,
  maybeInjectOg,
  ogCachePath,
} from "./og";
import { GEO_PATH, handleGeoRequest } from "./geo";
import { withSecurityHeaders } from "./securityHeaders";

export interface Env {
  ASSETS: Fetcher;
  CONVEX_SITE_URL?: string;
  // A Cloudflare secret, and .dev.vars locally. Convex needs the same value.
  GEO_TOKEN_SECRET?: string;
}

// With compatibility_date before 2025-04-01, requests that don't match a file
// (like /entries/<id>, /v/<number> and /api/geo) run this worker before the
// SPA fallback. Moving the date past that would serve those pages straight
// from assets, so it would need assets.run_worker_first for them.
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === GEO_PATH)
      return withSecurityHeaders(
        await handleGeoRequest(request, env.GEO_TOKEN_SECRET),
      );

    const lookup =
      request.method === "GET" ? entryLookupFromPath(url.pathname) : null;

    // Start the OG lookup alongside the asset fetch rather than after it
    const og =
      lookup && env.CONVEX_SITE_URL
        ? loadEntryOg({
            env,
            ctx,
            lookup,
            // The app tsconfig's DOM types don't know Workers' caches.default
            cache: (caches as unknown as { default: Cache }).default,
            cacheKey: new URL(ogCachePath(lookup), url).href,
          })
        : null;

    const originResponse = env.ASSETS
      ? await env.ASSETS.fetch(request)
      : await fetch(request);

    const response = await maybeInjectOg(request, originResponse, og);

    return withSecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;
