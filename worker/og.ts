/// <reference types="@cloudflare/workers-types" />

import { httpApiOgEntryReturnValidator } from "../shared/validators";
import {
  ENTRY_PHOTO,
  resizedPhotoSrcSet,
  resizedPhotoUrl,
} from "../shared/photoUrls";
import { iife } from "../shared/misc";
import { type Env } from "./worker";

type OgMeta = { title: string; description: string; imageUrl: string | null };
type CachedOg = { meta: OgMeta | null; fetchedAt: number };

// Serve cached OG data for an hour, then serve it stale while it refreshes.
// Entries that aren't approved (404) are rechecked sooner.
const FRESH_MS = 60 * 60_000;
const MISSING_FRESH_MS = 5 * 60_000;
const KEEP_SECONDS = 7 * 24 * 60 * 60;
// A visitor on a slow connection shouldn't also wait on Convex for the HTML
export const OG_TIMEOUT_MS = 800;

// Only entry pages and their vote pages: /entries/<id> and /entries/<id>/vote
export function entryIdFromPath(pathname: string): string | null {
  const [, section, id, ...rest] = pathname.split("/");
  if (section !== "entries" || !id || !/^[a-z0-9]{20,40}$/.test(id))
    return null;
  if (rest.length > 1 || (rest.length === 1 && rest[0] !== "vote")) return null;
  return id;
}

// Keyed like the cache, since each origin (apex, www) has its own entry
const refreshing = new Map<string, Promise<OgMeta | null>>();

// Resolves to null rather than rejecting, so a Convex problem never breaks
// the page.
export async function loadEntryOg({
  env,
  ctx,
  entryId,
  cache,
  cacheKey,
  now = Date.now(),
}: {
  env: Env;
  ctx: Pick<ExecutionContext, "waitUntil">;
  entryId: string;
  cache: Pick<Cache, "match" | "put">;
  cacheKey: string;
  now?: number;
}): Promise<OgMeta | null> {
  const refresh = () => {
    const inFlight = refreshing.get(cacheKey);
    if (inFlight) return inFlight;
    const next = fetchEntryOg(env, entryId)
      .then(async (meta) => {
        const value: CachedOg = { meta, fetchedAt: Date.now() };
        await cache.put(
          cacheKey,
          new Response(JSON.stringify(value), {
            headers: {
              "content-type": "application/json",
              "cache-control": `max-age=${KEEP_SECONDS}`,
            },
          }),
        );
        return meta;
      })
      .catch((error) => {
        console.warn(`Couldn't load OG data for ${entryId}:`, error);
        return null;
      })
      .finally(() => refreshing.delete(cacheKey));
    refreshing.set(cacheKey, next);
    ctx.waitUntil(next);
    return next;
  };

  const cached = await cache
    .match(cacheKey)
    .then((response) =>
      response ? (response.json() as Promise<CachedOg>) : null,
    )
    .catch(() => null);
  if (!cached) return refresh();

  const freshFor = cached.meta ? FRESH_MS : MISSING_FRESH_MS;
  if (now - cached.fetchedAt > freshFor) void refresh();
  return cached.meta;
}

// null means Convex says there's no public entry with this id
async function fetchEntryOg(env: Env, entryId: string): Promise<OgMeta | null> {
  if (!env.CONVEX_SITE_URL) throw new Error("CONVEX_SITE_URL not set");
  const url = new URL("/api/og/entry", env.CONVEX_SITE_URL);
  url.searchParams.set("entryId", entryId);
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`Convex returned ${res.status}: ${await res.text()}`);
  return httpApiOgEntryReturnValidator.parse(await res.json());
}

export function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function maybeInjectOg(
  request: Request,
  originResponse: Response,
  og: Promise<OgMeta | null> | null,
): Promise<Response> {
  if (!og) return originResponse;

  const contentType = originResponse.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return originResponse;

  const meta = await withTimeout(og, OG_TIMEOUT_MS);
  if (!meta) return originResponse;
  return injectHeadTags(
    originResponse,
    buildOgTags(new URL(request.url), meta),
  );
}

export function buildOgTags(url: URL, meta: OgMeta): string {
  const escapeHTML = (input: string) =>
    input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const source = meta.imageUrl;
  // Mock photos have site-relative paths
  const imageUrl = source ? new URL(source, url).href : null;
  // The same image the carousel's first <img> picks, so it downloads once
  const preload = iife(() => {
    if (!source) return "";
    if (!/^https?:\/\//.test(source))
      return `<link rel="preload" as="image" href="${escapeHTML(source)}" fetchpriority="high">`;
    const href = resizedPhotoUrl(source, ENTRY_PHOTO.fallbackWidth);
    const srcset = resizedPhotoSrcSet(source, ENTRY_PHOTO.widths);
    return `<link rel="preload" as="image" href="${escapeHTML(href)}" imagesrcset="${escapeHTML(srcset)}" imagesizes="${escapeHTML(ENTRY_PHOTO.sizes)}" fetchpriority="high">`;
  });

  return `
${preload}
<meta property="og:title" content="${escapeHTML(meta.title)}" />
<meta property="og:description" content="${escapeHTML(meta.description)}" />
${imageUrl ? `<meta property="og:image" content="${escapeHTML(imageUrl)}" />` : ""}
<meta property="og:type" content="article" />
<meta property="og:url" content="${escapeHTML(url.toString())}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${escapeHTML(url.toString())}" />
`;
}

function injectHeadTags(response: Response, tagsHtml: string): Response {
  return new HTMLRewriter()
    .on('meta[property^="og:"]', {
      element(e) {
        e.remove();
      },
    })
    .on('meta[name^="twitter:"]', {
      element(e) {
        e.remove();
      },
    })
    .on('link[rel="canonical"]', {
      element(e) {
        e.remove();
      },
    })
    .on("head", {
      element(head) {
        head.append(tagsHtml, { html: true });
      },
    })
    .transform(response);
}
