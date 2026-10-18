import { COMPETITION_GEOGRAPHIC_BOUNDARY } from "./constants";

export type LatLng = { lat: number; lng: number };

export type Boundary = { southWest: LatLng; northEast: LatLng };

// Edges count as inside
export function isWithinBoundary(
  { lat, lng }: LatLng,
  { southWest, northEast }: Boundary = COMPETITION_GEOGRAPHIC_BOUNDARY,
): boolean {
  return (
    lat >= southWest.lat &&
    lat <= northEast.lat &&
    lng >= southWest.lng &&
    lng <= northEast.lng
  );
}
