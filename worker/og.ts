/// <reference types="@cloudflare/workers-types" />

import { httpApiOgEntryReturnValidator } from "../shared/validators";
import { type Env } from "./worker";

type OgMeta = { title: string; description: string; imageUrl: string | null };

export async function maybeInjectOg(
  request: Request,
  env: Env,
  originResponse: Response,
): Promise<Response> {
  const url = new URL(request.url);

  const contentType = originResponse.headers.get("content-type") || "";
  const isHtml = contentType.includes("text/html");
  if (!isHtml) return originResponse;

  const isEntryRoute = url.pathname.startsWith("/entries/");
  if (!isEntryRoute) return originResponse;

  const entryId = url.pathname.split("/entries/")[1];
  if (!entryId) return originResponse;

  // In local dev or when convex returns errors (e.g. non-approved entries),
  // do not break the page. Only inject tags when fetch succeeds.
  if (!env.CONVEX_SITE_URL) return originResponse;
  try {
    const entryMeta = await fetchEntryOgMeta(env, entryId);
    const entryTags = buildOgTags(url, entryMeta, "article");
    return injectHeadTags(originResponse, entryTags);
  } catch (e) {
    return originResponse;
  }
}

function buildOgTags(
  url: URL,
  meta: OgMeta,
  type: "website" | "article",
): string {
  const escapeHTML = (input: string) =>
    input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const imageOrigin = meta.imageUrl ? new URL(meta.imageUrl).origin : null;
  return `
${imageOrigin ? `<link rel="preconnect" href="${escapeHTML(imageOrigin)}" crossorigin>` : ""}
${imageOrigin ? `<link rel="dns-prefetch" href="${escapeHTML(imageOrigin)}">` : ""}
${meta.imageUrl ? `<link rel="preload" as="image" href="${escapeHTML(meta.imageUrl)}" fetchpriority="high">` : ""}
<meta property="og:title" content="${escapeHTML(meta.title)}" />
<meta property="og:description" content="${escapeHTML(meta.description)}" />
${meta.imageUrl ? `<meta property="og:image" content="${escapeHTML(meta.imageUrl)}" />` : ""}
<meta property="og:type" content="${type}" />
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

async function fetchEntryOgMeta(env: Env, entryId: string): Promise<OgMeta> {
  if (!env.CONVEX_SITE_URL) throw new Error("CONVEX_SITE_URL not set");

  const url = `${env.CONVEX_SITE_URL}/api/og/entry?entryId=${encodeURIComponent(entryId)}`;
  console.log("Fetching entry meta from:", url);
  const res = await fetch(url, {
    cf: { cacheTtl: 120, cacheEverything: true },
  });
  if (!res.ok)
    throw new Error(
      `Failed to fetch entry meta from convex http api ${url}, err: ${await res.text()}`,
    );

  return res.json().then(httpApiOgEntryReturnValidator.parse);
}
