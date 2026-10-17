export type LatLng = { lat: number; lng: number };

// placeId is the id Google returned, which can differ from the one asked for
// when Google has refreshed it
export type GooglePlace = LatLng & { placeId: string };

// Looks up the place the user picked from autocomplete. Text search on the
// typed address can land on the street or suburb instead of the house.
export async function lookUpPlace(placeId: string): Promise<GooglePlace> {
  if (!placeId.trim()) throw new Error("Place id is empty");

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey)
    throw new Error(
      "Google Maps API key not configured. Run: npx convex env set GOOGLE_MAPS_API_KEY your_key_here",
    );

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,location,formattedAddress",
      },
    },
  );

  if (!res.ok)
    throw new Error(
      `Google Place Details request for "${placeId}" failed with status ${res.status}`,
    );

  const place = (await res.json()) as {
    id?: string;
    location?: { latitude: number; longitude: number };
  };

  if (!place.id || !place.location)
    throw new Error(`No place with a location found for id "${placeId}"`);

  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    placeId: place.id,
  };
}
