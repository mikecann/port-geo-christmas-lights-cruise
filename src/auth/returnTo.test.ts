import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./returnTo";

describe("safeReturnTo", () => {
  it.each([
    "/map",
    "/my-entries",
    "/entries/j970pq0asyav77fekdj08grwan6npmh1/vote",
    "/map/j970pq0asyav77fekdj08grwan6npmh1?ref=share#top",
    "/entries?q=a%2Fb",
  ])("keeps the same-origin path %s", (returnTo) => {
    expect(safeReturnTo(returnTo)).toBe(returnTo);
  });

  it("returns undefined when there is nothing to return to", () => {
    expect(safeReturnTo(undefined)).toBeUndefined();
    expect(safeReturnTo("")).toBeUndefined();
  });

  it.each([
    "javascript:alert(document.domain)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "javascript://%0Aalert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("rejects script URL %s", (returnTo) => {
    expect(safeReturnTo(returnTo)).toBeUndefined();
  });

  it.each([
    "https://evil.example",
    "http://evil.example/map",
    "HTTPS://evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/.//evil.example",
    "/map/..//evil.example",
    "evil.example",
    "map",
  ])("rejects off-site or non-path value %s", (returnTo) => {
    expect(safeReturnTo(returnTo)).toBeUndefined();
  });

  it.each([
    "%2F%2Fevil.example",
    "/%2Fevil.example",
    "/%5Cevil.example",
    "/%09/evil.example",
    "/%252F/evil.example",
    "%6Aavascript:alert(1)",
    "javascript%3Aalert(1)",
    "https%3A%2F%2Fevil.example",
    "/map%E0%A4%A",
  ])("rejects encoded variant %s", (returnTo) => {
    expect(safeReturnTo(returnTo)).toBeUndefined();
  });
});
