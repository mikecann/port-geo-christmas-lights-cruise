import { describe, expect, it } from "vitest";
import { isWithinBoundary } from "./geo";
import { COMPETITION_GEOGRAPHIC_BOUNDARY } from "./constants";

const { southWest, northEast } = COMPETITION_GEOGRAPHIC_BOUNDARY;

describe("isWithinBoundary", () => {
  it("accepts a house in Port Geographe", () => {
    expect(isWithinBoundary({ lat: -33.633471, lng: 115.395793 })).toBe(true);
  });

  it("counts the corners as inside", () => {
    expect(isWithinBoundary(southWest)).toBe(true);
    expect(isWithinBoundary(northEast)).toBe(true);
  });

  it("rejects points just past each edge", () => {
    const middle = {
      lat: (southWest.lat + northEast.lat) / 2,
      lng: (southWest.lng + northEast.lng) / 2,
    };
    const step = 0.0001;
    expect(isWithinBoundary({ ...middle, lat: southWest.lat - step })).toBe(
      false,
    );
    expect(isWithinBoundary({ ...middle, lat: northEast.lat + step })).toBe(
      false,
    );
    expect(isWithinBoundary({ ...middle, lng: southWest.lng - step })).toBe(
      false,
    );
    expect(isWithinBoundary({ ...middle, lng: northEast.lng + step })).toBe(
      false,
    );
  });

  it("rejects the 0,0 that an ungeocoded address would have", () => {
    expect(isWithinBoundary({ lat: 0, lng: 0 })).toBe(false);
  });

  it("checks against another boundary when given one", () => {
    const boundary = {
      southWest: { lat: 0, lng: 0 },
      northEast: { lat: 1, lng: 1 },
    };
    expect(isWithinBoundary({ lat: 0.5, lng: 0.5 }, boundary)).toBe(true);
    expect(isWithinBoundary({ lat: -33.63, lng: 115.39 }, boundary)).toBe(
      false,
    );
  });
});
