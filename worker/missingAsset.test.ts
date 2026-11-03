import { describe, expect, it } from "vitest";
import { notFoundForMissingAsset } from "./missingAsset";

const html = () =>
  new Response("<!doctype html>", {
    headers: {
      "content-type": "text/html",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });

describe("notFoundForMissingAsset", () => {
  it("turns the SPA fallback for a missing build file into an uncached 404", async () => {
    const response = notFoundForMissingAsset(
      "/assets/TicketsPage-CRh-KKS2.js",
      html(),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).not.toContain("text/html");
  });

  it("leaves real build files alone", () => {
    const js = new Response("export {}", {
      headers: { "content-type": "application/javascript" },
    });

    expect(notFoundForMissingAsset("/assets/index-B3ceCBa3.js", js)).toBe(js);
  });

  it("leaves page routes on the SPA fallback", () => {
    const page = html();

    expect(notFoundForMissingAsset("/tickets", page)).toBe(page);
    expect(notFoundForMissingAsset("/entries/abc", page)).toBe(page);
  });
});
