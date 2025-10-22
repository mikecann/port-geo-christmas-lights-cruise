import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geocodeAddress } from "./lib";

describe("geocodeAddress", () => {
  // Mock fetch globally
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    global.fetch = mockFetch;
    process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY: "test-api-key" };
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe("input validation", () => {
    it("should throw for empty string", async () => {
      await expect(geocodeAddress("")).rejects.toThrow("Address is empty");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw for whitespace-only string", async () => {
      await expect(geocodeAddress("   ")).rejects.toThrow("Address is empty");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw when API key is not configured", async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;

      await expect(geocodeAddress("123 Main St")).rejects.toThrow(
        "Google Maps API key not configured",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("API request construction", () => {
    it("should construct correct Places API request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              location: { latitude: -33.6, longitude: 115.3 },
              displayName: { text: "123 Main St" },
              formattedAddress: "123 Main St, Busselton WA, Australia",
            },
          ],
        }),
      });

      await geocodeAddress("123 Main St, Busselton");

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];

      // Verify the URL
      expect(url).toBe("https://places.googleapis.com/v1/places:searchText");

      // Verify the request method and headers
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        "Content-Type": "application/json",
        "X-Goog-Api-Key": "test-api-key",
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location",
      });

      // Verify the request body
      const requestBody = JSON.parse(options.body);
      expect(requestBody.textQuery).toBe("123 Main St, Busselton");
      expect(requestBody.regionCode).toBe("AU");
      expect(requestBody.pageSize).toBe(1);
      expect(requestBody.locationBias.rectangle.low).toEqual({
        latitude: -33.9,
        longitude: 115.1,
      });
      expect(requestBody.locationBias.rectangle.high).toEqual({
        latitude: -33.3,
        longitude: 115.7,
      });
    });
  });

  describe("API response handling", () => {
    it("should throw when API request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(geocodeAddress("123 Main St")).rejects.toThrow(
        "Google Places API request failed with status 500",
      );
    });

    it("should throw when API returns no places", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [],
        }),
      });

      await expect(geocodeAddress("NonexistentAddress123")).rejects.toThrow(
        'No results found for address: "NonexistentAddress123"',
      );
    });

    it("should throw when API returns empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(geocodeAddress("123 Main St")).rejects.toThrow(
        'No results found for address: "123 Main St"',
      );
    });

    it("should parse and return coordinates from valid response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              location: { latitude: -33.6485, longitude: 115.3474 },
              displayName: { text: "123 Main St" },
              formattedAddress: "123 Main St, Busselton WA, Australia",
            },
          ],
        }),
      });

      const result = await geocodeAddress("123 Main St, Busselton");

      expect(result).toEqual({
        lat: -33.6485,
        lng: 115.3474,
      });
    });

    it("should use first result when multiple results returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              location: { latitude: -33.6485, longitude: 115.3474 },
              displayName: { text: "123 Main St" },
              formattedAddress: "123 Main St, Busselton WA, Australia",
            },
            {
              location: { latitude: -33.7, longitude: 115.4 },
              displayName: { text: "456 Second St" },
              formattedAddress: "456 Second St, Perth WA, Australia",
            },
          ],
        }),
      });

      const result = await geocodeAddress("Main St");

      expect(result).toEqual({
        lat: -33.6485,
        lng: 115.3474,
      });
    });

    it("should handle coordinates as numbers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              location: { latitude: -33.6485, longitude: 115.3474 },
              displayName: { text: "Test Address" },
              formattedAddress: "Test Address, Busselton WA, Australia",
            },
          ],
        }),
      });

      const result = await geocodeAddress("Test Address");

      expect(result).toEqual({
        lat: -33.6485,
        lng: 115.3474,
      });
      expect(typeof result?.lat).toBe("number");
      expect(typeof result?.lng).toBe("number");
    });
  });

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(geocodeAddress("123 Main St")).rejects.toThrow(
        "Network error",
      );
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(geocodeAddress("123 Main St")).rejects.toThrow(
        "Invalid JSON",
      );
    });
  });
});

describe("geocodeAddress - Integration Tests", () => {
  // These tests make actual API calls - mark as integration tests
  it.skip("should geocode known Busselton addresses using Places API", async () => {
    // Skip by default to avoid hitting external API in CI
    // Run with: vitest --reporter=verbose --run lib.test.ts -t "Integration"
    // NOTE: Requires GOOGLE_MAPS_API_KEY environment variable to be set

    const result = await geocodeAddress("Queen Street, Busselton, WA");

    expect(result).not.toBe(null);
    expect(result?.lat).toBeCloseTo(-33.65, 1); // Roughly Busselton area
    expect(result?.lng).toBeCloseTo(115.35, 1); // Roughly Busselton area
  }, 10000); // 10 second timeout for API calls

  it.skip("should throw for completely invalid addresses", async () => {
    await expect(
      geocodeAddress("XYZ Invalid Address That Does Not Exist 12345"),
    ).rejects.toThrow(
      'No results found for address: "XYZ Invalid Address That Does Not Exist 12345"',
    );
  }, 10000);

  it.skip("should geocode partial addresses like 35 keel retreat", async () => {
    // Test with partial address which should work better with Places API
    // NOTE: Requires GOOGLE_MAPS_API_KEY environment variable to be set
    const result = await geocodeAddress("35 keel retreat");

    expect(result).not.toBe(null);
    expect(typeof result?.lat).toBe("number");
    expect(typeof result?.lng).toBe("number");

    console.log(
      `✓ Geocoded "35 keel retreat" to lat: ${result?.lat}, lng: ${result?.lng}`,
    );
  }, 10000);

  it.skip("should geocode Busselton addresses", async () => {
    // Test with Busselton which should definitely work with Google Places API
    // NOTE: Requires GOOGLE_MAPS_API_KEY environment variable to be set
    const result = await geocodeAddress("Busselton, WA, Australia");

    expect(result).not.toBe(null);
    // Busselton coordinates should be approximately:
    expect(result?.lat).toBeCloseTo(-33.6, 0); // Within 1 degree
    expect(result?.lng).toBeCloseTo(115.3, 0); // Within 1 degree

    console.log(
      `✓ Geocoded Busselton to lat: ${result?.lat}, lng: ${result?.lng}`,
    );
  }, 10000);
});
