import { describe, expect, it } from "vitest";
import { directionsUrl, shortAddress } from "./address";

describe("shortAddress", () => {
  it("drops a trailing country", () => {
    expect(shortAddress("12 Keel Retreat, Geographe WA 6280, Australia")).toBe(
      "12 Keel Retreat, Geographe WA 6280",
    );
  });

  it("leaves other addresses alone", () => {
    expect(shortAddress("12 Headstay Cove, Geographe WA")).toBe(
      "12 Headstay Cove, Geographe WA",
    );
  });
});

describe("directionsUrl", () => {
  it("points Google Maps at the house", () => {
    expect(directionsUrl({ lat: -33.63, lng: 115.39 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-33.63,115.39",
    );
  });
});
