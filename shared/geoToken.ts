import { z } from "zod";

// The Cloudflare Worker sees the voter's IP location and signs it, so the vote
// mutation (which can't see the IP) can trust it. Both sides need the same
// GEO_TOKEN_SECRET.
export const GEO_TOKEN_LIFETIME_MS = 15 * 60_000;
// Allows for the worker's clock being a little ahead of Convex's
const ALLOWED_CLOCK_SKEW_MS = 60_000;

const geoLocationSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  regionCode: z.string().optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
});

const geoTokenPayloadSchema = geoLocationSchema.extend({
  issuedAt: z.number(),
});

export type GeoLocation = z.infer<typeof geoLocationSchema>;
export type GeoTokenPayload = z.infer<typeof geoTokenPayloadSchema>;

export type GeoTokenCheck =
  | { ok: true; payload: GeoTokenPayload }
  | { ok: false; reason: "invalid" | "expired" };

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const fromBase64Url = (text: string) => {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const importKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

// <base64url JSON payload>.<base64url HMAC-SHA256 of the first part>
export async function signGeoToken(payload: GeoTokenPayload, secret: string) {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret),
    encoder.encode(body),
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyGeoToken(
  token: string,
  secret: string,
  now: number,
): Promise<GeoTokenCheck> {
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length > 0)
    return { ok: false, reason: "invalid" };

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(secret),
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return { ok: false, reason: "invalid" };
    const payload = geoTokenPayloadSchema.parse(
      JSON.parse(new TextDecoder().decode(fromBase64Url(body))),
    );
    if (payload.issuedAt > now + ALLOWED_CLOCK_SKEW_MS)
      return { ok: false, reason: "invalid" };
    if (now - payload.issuedAt > GEO_TOKEN_LIFETIME_MS)
      return { ok: false, reason: "expired" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
