import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lookUpPlace } from "./lib";

describe("lookUpPlace", () => {
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
      await expect(lookUpPlace("")).rejects.toThrow("Place id is empty");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw for whitespace-only string", async () => {
      await expect(lookUpPlace("   ")).rejects.toThrow("Place id is empty");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw when API key is not configured", async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;

      await expect(lookUpPlace("ChIJ123")).rejects.toThrow(
        "Google Maps API key not configured",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("API request construction", () => {
    it("should ask Place Details for the given place id", async () => {
      delete process.env.SITE_URL;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ChIJ123",
          location: { latitude: -33.6, longitude: 115.3 },
          formattedAddress: "35 Keel Retreat, Geographe WA 6280, Australia",
        }),
      });

      await lookUpPlace("ChIJ123");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://places.googleapis.com/v1/places/ChIJ123");
      expect(options.method).toBe("GET");
      expect(options.headers).toEqual({
        "X-Goog-Api-Key": "test-api-key",
        "X-Goog-FieldMask": "id,location,formattedAddress",
        Referer: "https://portgeochristmascruise.com.au/",
      });
    });

    it("should send SITE_URL as the Referer so a website-restricted key works", async () => {
      process.env.SITE_URL = "http://localhost:5173/";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ChIJ123",
          location: { latitude: -33.6, longitude: 115.3 },
        }),
      });

      await lookUpPlace("ChIJ123");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Referer).toBe("http://localhost:5173/");
    });

    it("should encode the place id into the path", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "a/b",
          location: { latitude: -33.6, longitude: 115.3 },
        }),
      });

      await lookUpPlace("a/b?x=1");

      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://places.googleapis.com/v1/places/a%2Fb%3Fx%3D1",
      );
    });
  });

  describe("API response handling", () => {
    it("should throw when Google doesn't know the place", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(lookUpPlace("made-up")).rejects.toThrow(
        'Google Place Details request for "made-up" failed with status 404',
      );
    });

    it("should throw when the response has no location", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ChIJ123" }),
      });

      await expect(lookUpPlace("ChIJ123")).rejects.toThrow(
        'No place with a location found for id "ChIJ123"',
      );
    });

    it("should throw when the response has no id", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          location: { latitude: -33.6, longitude: 115.3 },
        }),
      });

      await expect(lookUpPlace("ChIJ123")).rejects.toThrow(
        'No place with a location found for id "ChIJ123"',
      );
    });

    it("should return Google's location and id", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ChIJ123",
          location: { latitude: -33.6485, longitude: 115.3474 },
        }),
      });

      expect(await lookUpPlace("ChIJ123")).toEqual({
        lat: -33.6485,
        lng: 115.3474,
        placeId: "ChIJ123",
      });
    });

    it("should return Google's id when it differs from the one asked for", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ChIJ-refreshed",
          location: { latitude: -33.6485, longitude: 115.3474 },
        }),
      });

      const result = await lookUpPlace("ChIJ-old");

      expect(result.placeId).toBe("ChIJ-refreshed");
    });
  });

  describe("error handling", () => {
    it("should pass network errors through", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(lookUpPlace("ChIJ123")).rejects.toThrow("Network error");
    });

    it("should pass malformed JSON errors through", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(lookUpPlace("ChIJ123")).rejects.toThrow("Invalid JSON");
    });
  });
});

describe("lookUpPlace - Integration Tests", () => {
  // These tests make actual API calls and need GOOGLE_MAPS_API_KEY set.
  // Run with: vitest --run lib.test.ts -t "Integration"
  it.skip("should look up a Busselton place id", async () => {
    // Copy a place id for a Busselton address from the entry form's autocomplete
    const result = await lookUpPlace(process.env.TEST_BUSSELTON_PLACE_ID ?? "");

    expect(result.lat).toBeCloseTo(-33.6, 0);
    expect(result.lng).toBeCloseTo(115.3, 0);
  }, 10000);

  it.skip("should throw for a made-up place id", async () => {
    await expect(lookUpPlace("not-a-real-place-id")).rejects.toThrow();
  }, 10000);
});
