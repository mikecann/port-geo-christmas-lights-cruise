/// <reference types="@cloudflare/workers-types" />

import { signGeoToken, type GeoLocation } from "../shared/geoToken";

export const GEO_PATH = "/api/geo";

type CfLocation = Pick<
  IncomingRequestCfProperties,
  | "country"
  | "region"
  | "regionCode"
  | "city"
  | "latitude"
  | "longitude"
  | "timezone"
>;

// Cloudflare gives coordinates as strings, and leaves out what it doesn't know
export function locationFromCf(cf: Partial<CfLocation> | undefined) {
  const text = (value: unknown) =>
    typeof value === "string" && value !== "" ? value : undefined;
  const number = (value: unknown) => {
    const parsed = Number(value);
    return value !== undefined && value !== "" && Number.isFinite(parsed)
      ? parsed
      : undefined;
  };
  const location: GeoLocation = {
    country: text(cf?.country),
    region: text(cf?.region),
    regionCode: text(cf?.regionCode),
    city: text(cf?.city),
    latitude: number(cf?.latitude),
    longitude: number(cf?.longitude),
    timezone: text(cf?.timezone),
  };
  return Object.fromEntries(
    Object.entries(location).filter(([, value]) => value !== undefined),
  ) as GeoLocation;
}

// Without the secret there's no token, and Convex treats every vote as
// People's Choice only
export async function handleGeoRequest(
  request: Request,
  secret: string | undefined,
  now = Date.now(),
): Promise<Response> {
  const cf = (request as Request & { cf?: Partial<CfLocation> }).cf;
  const token = secret
    ? await signGeoToken(
        { ...locationFromCf(cf), issuedAt: now, nonce: crypto.randomUUID() },
        secret,
      )
    : null;
  return Response.json(
    { token },
    { headers: { "cache-control": "no-store, private" } },
  );
}
