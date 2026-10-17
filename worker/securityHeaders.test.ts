import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "./securityHeaders";

describe("withSecurityHeaders", () => {
  it("adds the security headers and keeps the response intact", async () => {
    const response = withSecurityHeaders(
      new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<html></html>");
    expect(Object.fromEntries(response.headers)).toEqual({
      "content-type": "text/html",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "DENY",
      "content-security-policy": "frame-ancestors 'none'",
      "permissions-policy": "camera=(), microphone=(), geolocation=(self)",
      "strict-transport-security": "max-age=31536000",
    });
  });

  it("doesn't replace headers the asset response already set", () => {
    const response = withSecurityHeaders(
      new Response(null, {
        status: 304,
        headers: { "Referrer-Policy": "no-referrer" },
      }),
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
