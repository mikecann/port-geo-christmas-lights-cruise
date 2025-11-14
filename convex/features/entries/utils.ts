import { COMPETITION_GEOGRAPHIC_BOUNDARY, usersWhiteList } from "../../../shared/constants";

/**
 * Checks if the given latitude and longitude coordinates are within
 * the allowed geographic boundary for competition entries.
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @returns true if coordinates are within the boundary, false otherwise
 */
export function isLocationWithinCompetitionBoundary(
  lat: number,
  lng: number,
): boolean {
  const { southWest, northEast } = COMPETITION_GEOGRAPHIC_BOUNDARY;

  return (
    lat >= southWest.lat &&
    lat <= northEast.lat &&
    lng >= southWest.lng &&
    lng <= northEast.lng
  );
}

/**
 * Checks if a user's email is on the whitelist.
 * Comparison is case-insensitive.
 * @param email - User's email address
 * @returns true if email is on the whitelist, false otherwise
 */
export function isUserEmailOnWhitelist(email: string | undefined): boolean {
  if (!email) return false;
  const emailLower = email.toLowerCase().trim();
  return usersWhiteList.some(
    (user) => user.email.toLowerCase().trim() === emailLower,
  );
}

