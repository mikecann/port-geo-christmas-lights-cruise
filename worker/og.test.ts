import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOgTags,
  entryIdFromPath,
  loadEntryOg,
  OG_TIMEOUT_MS,
  withTimeout,
} from "./og";
import { ENTRY_PHOTO, resizedPhotoSrcSet } from "../shared/photoUrls";

const id = "j970pq0asyav77fekdj08grwan6npmh1";
const meta = {
  title: "Twinkle Town",
  description: "1 Keel Retreat",
  imageUrl: "https://files.example/photo.jpg",
};
const env = {
  ASSETS: {} as Fetcher,
  CONVEX_SITE_URL: "https://convex.example/",
};
const hour = 60 * 60_000;

function memoryCache() {
  const store = new Map<string, string>();
  return {
    store,
    match: async (key: string) =>
      store.has(key) ? new Response(store.get(key)) : undefined,
    put: async (key: string, response: Response) => {
      store.set(key, await response.text());
    },
  } as unknown as Cache & { store: Map<string, string> };
}

let fetchMock: ReturnType<typeof vi.fn>;
let waiting: Array<Promise<unknown>>;
const ctx = { waitUntil: (p: Promise<unknown>) => void waiting.push(p) };
const load = (cache: Cache, now?: number) =>
  loadEntryOg({ env, ctx, entryId: id, cache, cacheKey: "og", now });

beforeEach(() => {
  waiting = [];
  fetchMock = vi.fn(async () => Response.json(meta));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("entryIdFromPath", () => {
  it("finds the id on entry and vote pages only", () => {
    expect(entryIdFromPath(`/entries/${id}`)).toBe(id);
    expect(entryIdFromPath(`/entries/${id}/vote`)).toBe(id);
    expect(entryIdFromPath(`/entries/${id}/`)).toBe(null);
    expect(entryIdFromPath(`/entries/${id}/other`)).toBe(null);
    expect(entryIdFromPath("/entries")).toBe(null);
    expect(entryIdFromPath("/entries/not-an-id")).toBe(null);
    expect(entryIdFromPath(`/map/${id}`)).toBe(null);
  });
});

describe("loadEntryOg", () => {
  it("fetches once from Convex and then serves from the cache", async () => {
    const cache = memoryCache();
    expect(await load(cache)).toEqual(meta);
    await Promise.all(waiting);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `https://convex.example/api/og/entry?entryId=${id}`,
    );

    expect(await load(cache)).toEqual(meta);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves stale data straight away and refreshes in the background", async () => {
    const cache = memoryCache();
    await load(cache);
    await Promise.all(waiting);
    const updated = { ...meta, title: "Even More Twinkly" };
    fetchMock.mockImplementation(async () => Response.json(updated));

    expect(await load(cache, Date.now() + 2 * hour)).toEqual(meta);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await Promise.all(waiting);
    expect(await load(cache)).toEqual(updated);
  });

  it("remembers entries Convex doesn't have, but rechecks them sooner", async () => {
    const cache = memoryCache();
    fetchMock.mockImplementation(async () => new Response("", { status: 404 }));
    expect(await load(cache)).toBe(null);
    await Promise.all(waiting);
    expect(await load(cache)).toBe(null);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await load(cache, Date.now() + 10 * 60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null and caches nothing when Convex fails", async () => {
    const cache = memoryCache();
    fetchMock.mockImplementation(
      async () => new Response("boom", { status: 500 }),
    );
    expect(await load(cache)).toBe(null);
    await Promise.all(waiting);
    expect(cache.store.size).toBe(0);
  });
});

describe("withTimeout", () => {
  it("gives up on a slow lookup", async () => {
    vi.useFakeTimers();
    const slow = withTimeout(new Promise(() => {}), OG_TIMEOUT_MS);
    vi.advanceTimersByTime(OG_TIMEOUT_MS);
    expect(await slow).toBe(null);
    vi.useRealTimers();
  });
});

describe("buildOgTags", () => {
  const url = new URL(`https://site.example/entries/${id}/vote`);

  it("preloads the carousel's responsive image and shares the original", () => {
    const tags = buildOgTags(url, meta);
    const srcset = resizedPhotoSrcSet(meta.imageUrl, ENTRY_PHOTO.widths);
    expect(tags).toContain(`imagesrcset="${srcset}"`);
    expect(tags).toContain(`imagesizes="${ENTRY_PHOTO.sizes}"`);
    expect(tags).toContain(
      `<meta property="og:image" content="${meta.imageUrl}" />`,
    );
    expect(tags).not.toContain("preconnect");
    expect(tags).not.toContain(`href="${meta.imageUrl}"`);
  });

  it("makes mock photo paths absolute for sharing", () => {
    const tags = buildOgTags(url, { ...meta, imageUrl: "/mockPhotos/a.jpg" });
    expect(tags).toContain('content="https://site.example/mockPhotos/a.jpg"');
    expect(tags).not.toContain("imagesrcset");
  });

  it("escapes entry text", () => {
    const tags = buildOgTags(url, { ...meta, title: '"><script>' });
    expect(tags).toContain("&quot;&gt;&lt;script&gt;");
  });
});
