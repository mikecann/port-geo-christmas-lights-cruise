import { describe, expect, it } from "vitest";
import { handleGeoRequest, locationFromCf } from "./geo";
import {
  GEO_TOKEN_LIFETIME_MS,
  signGeoToken,
  verifyGeoToken,
  type GeoTokenPayload,
} from "../shared/geoToken";

const secret = "test-geo-secret";
const now = Date.UTC(2026, 11, 5, 11, 30);
const busselton = {
  country: "AU",
  region: "Western Australia",
  regionCode: "WA",
  city: "Busselton",
  latitude: "-33.65",
  longitude: "115.35",
  timezone: "Australia/Perth",
};

const requestFrom = (cf: object | undefined) =>
  Object.assign(new Request("https://example.com/api/geo"), { cf });

describe("locationFromCf", () => {
  it("turns Cloudflare's string coordinates into numbers", () => {
    expect(locationFromCf(busselton)).toEqual({
      ...busselton,
      latitude: -33.65,
      longitude: 115.35,
    });
  });

  it("leaves out what Cloudflare doesn't know", () => {
    expect(locationFromCf({ country: "AU", city: "", latitude: "" })).toEqual({
      country: "AU",
    });
    expect(locationFromCf(undefined)).toEqual({});
  });
});

describe("handleGeoRequest", () => {
  it("returns a signed token with the location and when it was issued", async () => {
    const response = await handleGeoRequest(
      requestFrom(busselton),
      secret,
      now,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    const { token } = (await response.json()) as { token: string };

    const check = await verifyGeoToken(token, secret, now);
    expect(check).toEqual({
      ok: true,
      payload: {
        ...busselton,
        latitude: -33.65,
        longitude: 115.35,
        issuedAt: now,
        nonce: expect.any(String),
      },
    });
  });

  it("gives every token its own nonce, so each can only be used once", async () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const response = await handleGeoRequest(
        requestFrom(busselton),
        secret,
        now,
      );
      const { token } = (await response.json()) as { token: string };
      const check = await verifyGeoToken(token, secret, now);
      if (check.ok) nonces.add(check.payload.nonce);
    }
    expect(nonces.size).toBe(3);
  });

  it("gives no token when the secret isn't set", async () => {
    const response = await handleGeoRequest(
      requestFrom(busselton),
      undefined,
      now,
    );
    expect(await response.json()).toEqual({ token: null });
  });
});

describe("verifyGeoToken", () => {
  const nonce = "0123456789abcdef";
  const sign = (issuedAt = now) =>
    signGeoToken({ country: "AU", city: "Perth", issuedAt, nonce }, secret);

  it("accepts a token until it's 10 minutes old", async () => {
    expect(GEO_TOKEN_LIFETIME_MS).toBe(10 * 60_000);
    const token = await sign();
    expect(
      (await verifyGeoToken(token, secret, now + GEO_TOKEN_LIFETIME_MS)).ok,
    ).toBe(true);
    expect(
      await verifyGeoToken(token, secret, now + GEO_TOKEN_LIFETIME_MS + 1),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects tokens from the future", async () => {
    expect(
      await verifyGeoToken(await sign(now + 5 * 60_000), secret, now),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signGeoToken(
      { country: "AU", issuedAt: now, nonce },
      "someone-elses-secret",
    );
    expect(await verifyGeoToken(token, secret, now)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects a token whose location was changed", async () => {
    const [, signature] = (await sign()).split(".");
    const forged = btoa(JSON.stringify({ country: "AU", issuedAt: now, nonce }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    expect(await verifyGeoToken(`${forged}.${signature}`, secret, now)).toEqual(
      { ok: false, reason: "invalid" },
    );
  });

  it("rejects a token signed before tokens had a nonce", async () => {
    const token = await signGeoToken(
      { country: "AU", issuedAt: now } as GeoTokenPayload,
      secret,
    );
    expect(await verifyGeoToken(token, secret, now)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects things that aren't tokens", async () => {
    for (const token of ["", "abc", "a.b.c", "!!!.???"])
      expect(await verifyGeoToken(token, secret, now)).toEqual({
        ok: false,
        reason: "invalid",
      });
  });

  it("keeps non-ASCII place names intact", async () => {
    const token = await signGeoToken(
      { country: "NZ", city: "Ōtautahi", issuedAt: now, nonce },
      secret,
    );
    const check = await verifyGeoToken(token, secret, now);
    expect(check.ok && check.payload.city).toBe("Ōtautahi");
  });
});
