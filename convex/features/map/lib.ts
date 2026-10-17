export type LatLng = { lat: number; lng: number };

// placeId is Google's id for the place it found, not the one the client sent
export type GeocodedPlace = LatLng & { placeId: string };

export async function geocodeAddress(address: string): Promise<GeocodedPlace> {
  if (!address.trim()) throw new Error("Address is empty");

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey)
    throw new Error(
      "Google Maps API key not configured. Run: npx convex env set GOOGLE_MAPS_API_KEY your_key_here",
    );

  // Use Places API Text Search for better address resolution
  const url = "https://places.googleapis.com/v1/places:searchText";

  const requestBody = {
    textQuery: address,
    // Bias results to Busselton area (SW WA)
    locationBias: {
      rectangle: {
        low: {
          latitude: -33.9,
          longitude: 115.1,
        },
        high: {
          latitude: -33.3,
          longitude: 115.7,
        },
      },
    },
    // Limit to 1 result since we just need coordinates
    pageSize: 1,
    // Specify Australian region
    regionCode: "AU",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // Specify minimal fields needed for geocoding
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok)
    throw new Error(
      `Google Places API request failed with status ${res.status}`,
    );

  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      location: { latitude: number; longitude: number };
    }>;
  };

  //console.log("Places API response:", data);

  if (data.places && data.places.length > 0) {
    const place = data.places[0];
    if (!place.id)
      throw new Error(`No place id returned for address: "${address}"`);
    const location = place.location;
    return {
      lat: location.latitude,
      lng: location.longitude,
      placeId: place.id,
    };
  } else throw new Error(`No results found for address: "${address}"`);
}
