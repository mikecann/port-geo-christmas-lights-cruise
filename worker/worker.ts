/// <reference types="@cloudflare/workers-types" />

import { maybeInjectOg } from "./og";
import { withSecurityHeaders } from "./securityHeaders";

export interface Env {
  ASSETS: Fetcher;
  CONVEX_SITE_URL?: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // 1) Serve SPA/static assets first
    const originResponse = env.ASSETS
      ? await env.ASSETS.fetch(request)
      : await fetch(request);

    // 2) Inject OG tags on relevant routes
    const response = await maybeInjectOg(request, env, originResponse);

    return withSecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;
