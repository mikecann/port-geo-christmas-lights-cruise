import { action } from "../../_generated/server";
import { v } from "convex/values";

// You'll need to add your Google Maps API key to your Convex environment
// Run: npx convex env set GOOGLE_MAPS_API_KEY your_key_here

export const geocodeAddress = action({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) throw new Error("Google Maps API key not configured");

    const encodedAddress = encodeURIComponent(args.address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = (await response.json()) as {
        status: string;
        results?: Array<{
          geometry: { location: { lat: number; lng: number } };
          formatted_address: string;
          place_id: string;
          address_components: unknown;
        }>;
      };

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        return {
          success: true,
          data: {
            lat: location.lat,
            lng: location.lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
            addressComponents: result.address_components,
          },
        };
      } else
        return {
          success: false,
          error: `Geocoding failed: ${data.status}`,
        };
    } catch (error) {
      return {
        success: false,
        error: `Failed to geocode address: ${error}`,
      };
    }
  },
});

// Helper function to geocode multiple addresses
export const geocodeMultipleAddresses = action({
  args: {
    addresses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) throw new Error("Google Maps API key not configured");

    const results = [];

    // Process addresses one by one to avoid rate limiting
    for (const address of args.addresses) {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

      try {
        const response = await fetch(url);
        const data = (await response.json()) as {
          status: string;
          results?: Array<{
            geometry: { location: { lat: number; lng: number } };
            formatted_address: string;
            place_id: string;
            address_components: unknown;
          }>;
        };

        if (data.status === "OK" && data.results && data.results.length > 0) {
          const result = data.results[0];
          const location = result.geometry.location;

          results.push({
            address,
            success: true,
            data: {
              lat: location.lat,
              lng: location.lng,
              formattedAddress: result.formatted_address,
              placeId: result.place_id,
              addressComponents: result.address_components,
            },
          });
        } else
          results.push({
            address,
            success: false,
            error: `Geocoding failed: ${data.status}`,
          });
      } catch (error) {
        results.push({
          address,
          success: false,
          error: `Failed to geocode address: ${error}`,
        });
      }

      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  },
});
