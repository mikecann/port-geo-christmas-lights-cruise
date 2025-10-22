/// <reference types="@cloudflare/workers-types" />

import { maybeInjectOg } from "./og";

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
    return maybeInjectOg(request, env, originResponse);
  },
} satisfies ExportedHandler<Env>;
