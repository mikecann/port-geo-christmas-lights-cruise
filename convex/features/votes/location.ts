import {
  GEO_TOKEN_LIFETIME_MS,
  verifyGeoToken,
} from "../../../shared/geoToken";
import type { DatabaseWriter } from "../../_generated/server";
import type { InPersonArea } from "../competitions/model";
import type { LocationCheck, VoterLocation } from "./schema";

export type VoterLocationCheck = {
  locationCheck: LocationCheck;
  location?: VoterLocation;
  // Only set when the token was genuine and fresh
  nonce?: string;
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

  const { nonce, ...location } = verified.payload;
  if (location.country === undefined)
    return { locationCheck: "no_location", location, nonce };
  const inArea =
    area.countries.includes(location.country) &&
    (!area.waOnly ||
      (location.country === "AU" && location.regionCode === "WA"));
  return { locationCheck: inArea ? "ok" : "outside_area", location, nonce };
}

// The vote mutation's check: the same, but each token only works once
export async function claimVoterLocation(
  db: DatabaseWriter,
  area: InPersonArea,
  geoToken: string | undefined,
  now: number,
): Promise<VoterLocationCheck> {
  const check = await checkVoterLocation(area, geoToken, now);
  const { nonce, location } = check;
  if (nonce === undefined || location === undefined) return check;
  const used = await db
    .query("usedGeoTokens")
    .withIndex("by_nonce", (q) => q.eq("nonce", nonce))
    .first();
  if (used !== null) return { locationCheck: "reused" };
  await db.insert("usedGeoTokens", { nonce, issuedAt: location.issuedAt });
  return check;
}

// Tokens this old fail as expired, so their nonces needn't be kept
export const usedGeoTokenCutoff = (now: number) => now - GEO_TOKEN_LIFETIME_MS;
