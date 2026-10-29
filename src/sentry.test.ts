import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ErrorEvent } from "@sentry/react";
const sdk = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock("@sentry/react", () => sdk);
vi.stubGlobal("__SENTRY_RELEASE__", "port-geo-xmas-lights@test");

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("VITE_IS_TEST_MODE", "false");
});

async function initOn(hostname: string, prod: boolean) {
  vi.stubEnv("PROD", prod);
  vi.stubGlobal("location", { hostname });
  const { initSentry } = await import("./sentry");
  return await initSentry();
}

describe("sentry gating", () => {
  it("stays off in dev, previews, localhost and test mode", async () => {
    expect(await initOn("portgeochristmascruise.com.au", false)).toBe(false);
    expect(await initOn("localhost", true)).toBe(false);
    expect(
      await initOn("port-geo-christmas-lights-cruise.workers.dev", true),
    ).toBe(false);
    expect(
      await initOn("portgeochristmascruise.com.au.example.com", true),
    ).toBe(false);
    vi.stubEnv("VITE_IS_TEST_MODE", "true");
    expect(await initOn("portgeochristmascruise.com.au", true)).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it("reports errors only from the production site", async () => {
    expect(await initOn("www.portgeochristmascruise.com.au", true)).toBe(true);
    const options = sdk.init.mock.calls[0][0];
    expect(options.environment).toBe("production");
    expect(options.release).toBe("port-geo-xmas-lights@test");
    expect(options.initialScope.tags.component).toBe("web");
    expect(options.tracesSampleRate).toBe(0);
    expect(options.dataCollection.userInfo).toBe(false);
    expect(options.dataCollection.urlQueryParams).toBe(false);
    expect(options.replaysSessionSampleRate).toBeUndefined();
    const kept = options.integrations([
      { name: "GlobalHandlers" },
      { name: "BrowserSession" },
    ]);
    expect(kept).toEqual([{ name: "GlobalHandlers" }]);
  });
});

describe("sentry scrubbing", () => {
  it("keeps only navigation breadcrumbs, as paths", async () => {
    const { scrubBreadcrumb } = await import("./sentry");
    expect(scrubBreadcrumb({ category: "console", message: "a@b.com" })).toBe(
      null,
    );
    expect(scrubBreadcrumb({ category: "fetch", data: { url: "x" } })).toBe(
      null,
    );
    expect(scrubBreadcrumb({ category: "ui.click", message: "input" })).toBe(
      null,
    );
    expect(
      scrubBreadcrumb({
        category: "navigation",
        data: { from: "/signin?code=secret", to: "/entries/abc#top" },
      })?.data,
    ).toEqual({ from: "/signin", to: "/entries/abc" });
  });

  it("drops the user, query string and referrer, and masks emails and phone numbers", async () => {
    const { scrubEvent } = await import("./sentry");
    const event = scrubEvent({
      type: undefined,
      user: { email: "jo@example.com", ip_address: "1.2.3.4" },
      message: "Failed for jo.smith+xmas@example.com.au",
      request: {
        url: "https://portgeochristmascruise.com.au/signin?code=secret",
        headers: { "User-Agent": "Safari", Referer: "https://x.com/?q=1" },
        query_string: "code=secret",
        cookies: { a: "b" },
      },
      exception: {
        values: [{ type: "Error", value: "Call 0412 345 678 about entry 42" }],
      },
    } as ErrorEvent);
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({
      url: "https://portgeochristmascruise.com.au/signin",
      headers: { "User-Agent": "Safari" },
    });
    expect(event.message).toBe("Failed for [email]");
    expect(event.exception?.values?.[0].value).toBe(
      "Call [number] about entry 42",
    );
  });
});
