import { verifyGeoToken } from "../../../shared/geoToken";
import type { InPersonArea } from "../competitions/model";
import type { LocationCheck, VoterLocation } from "./schema";

export type VoterLocationCheck = {
  locationCheck: LocationCheck;
  location?: VoterLocation;
};

// Fails closed: without the secret, or a genuine and fresh token from inside
// the area, a vote can only count for People's Choice
export async function checkVoterLocation(
  area: InPersonArea,
  geoToken: string | undefined,
  now: number,
): Promise<VoterLocationCheck> {
  const secret = process.env.GEO_TOKEN_SECRET;
  if (!secret) return { locationCheck: "not_configured" };
  if (!geoToken) return { locationCheck: "no_location" };

  const verified = await verifyGeoToken(geoToken, secret, now);
  if (!verified.ok) return { locationCheck: verified.reason };

  const location = verified.payload;
  if (location.country === undefined)
    return { locationCheck: "no_location", location };
  const inArea =
    area.countries.includes(location.country) &&
    (!area.waOnly ||
      (location.country === "AU" && location.regionCode === "WA"));
  return { locationCheck: inArea ? "ok" : "outside_area", location };
}
