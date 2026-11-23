import { describe, expect, it } from "vitest";
import {
  GROUP_PIN,
  groupPins,
  MAX_SPLIT_ZOOM,
  NUMBER_PIN,
  PHOTO_PIN,
  zoomForGroupTap,
  zoomToSplit,
} from "./groupPins";

// Real spacing from the 2026 entries: #48 and #52 are 14 m apart, #8 and #18
// 49 m, and #43 is off on its own
const METRE = 1 / 111_000;
const base = { lat: -33.6305, lng: 115.384 };
const at = (id: string, north: number, east: number) => ({
  id,
  lat: base.lat + north * METRE,
  lng: base.lng + (east * METRE) / Math.cos((base.lat * Math.PI) / 180),
});
const h48 = at("48", 0, 0);
const h52 = at("52", 0, 14);
const h8 = at("8", 300, 0);
const h18 = at("18", 300, 49);
const h43 = at("43", -600, 0);
const all = [h48, h52, h8, h18, h43];
const phone = { width: 390, height: 784 };

const ids = (groups: ReturnType<typeof groupPins>) =>
  groups.map((g) => g.members.map((m) => m.id));

describe("groupPins", () => {
  it("groups close houses zoomed out and splits them zoomed in", () => {
    expect(ids(groupPins(all, 12, NUMBER_PIN))).toEqual([
      ["48", "52", "8", "18", "43"],
    ]);
    expect(ids(groupPins(all, 16, PHOTO_PIN))).toEqual([
      ["48", "52"],
      ["8", "18"],
      ["43"],
    ]);
    expect(ids(groupPins(all, 20, PHOTO_PIN))).toEqual([
      ["48"],
      ["52"],
      ["8"],
      ["18"],
      ["43"],
    ]);
  });

  it("puts a group pin in the middle of its houses", () => {
    const [group] = groupPins([h48, h52], 15, PHOTO_PIN);
    expect(group.lat).toBeCloseTo(base.lat, 8);
    expect(group.lng).toBeCloseTo((h48.lng + h52.lng) / 2, 10);
  });
});

describe("tapping a group", () => {
  it("zooms in far enough that the group splits", () => {
    const target = zoomForGroupTap([h8, h18], 16, phone) ?? 0;
    expect(target).toBeGreaterThan(16);
    expect(ids(groupPins([h8, h18], target, PHOTO_PIN))).toEqual([
      ["8"],
      ["18"],
    ]);
  });

  it("opens a big group in steps, keeping every house on screen", () => {
    const target = zoomForGroupTap(all, 12, phone) ?? 0;
    expect(target).toBeGreaterThanOrEqual(13);
    expect(target).toBeLessThan(zoomToSplit(all, 12));
  });

  it("lists houses that are still too close at the closest zoom", () => {
    const sameSpot = [h48, { ...h48, id: "48b" }];
    expect(zoomForGroupTap(sameSpot, 17, phone)).toBeNull();
    const semi = [h48, at("48a", 0, 3)];
    expect(zoomForGroupTap(semi, 18, phone)).toBeNull();
    expect(zoomToSplit(semi, 18)).toBeGreaterThan(MAX_SPLIT_ZOOM);
  });

  it("still zooms a spread group that has two houses on one spot", () => {
    const group = [h48, { ...h48, id: "48b" }, h43];
    expect(zoomForGroupTap(group, 12, phone)).toBeGreaterThan(12);
  });

  it("lists a chain too wide to zoom in on without losing houses", () => {
    // Ten houses 30pt apart at zoom 12: 270pt wide, so one step in would
    // push the ends off a phone screen
    const chain = Array.from({ length: 10 }, (_, i) =>
      at(`c${i}`, 0, i * 30 * 30),
    );
    expect(zoomForGroupTap(chain, 12, phone)).toBeNull();
  });

  it("always zooms to a whole step, even from a part-way zoom", () => {
    const target = zoomForGroupTap([h8, h18], 15.4, phone) ?? 0;
    expect(Number.isInteger(target)).toBe(true);
  });

  it("copes with a map that hasn't been laid out yet", () => {
    const target = zoomForGroupTap([h8, h18], 15, { width: 0, height: 0 });
    expect(target === null || Number.isFinite(target)).toBe(true);
  });
});

describe("group pins don't land on other pins", () => {
  it("pulls in a house the group's own pin would cover", () => {
    // At zoom 18, A and B sit side by side and group. C, 30pt above their
    // middle, is clear of both their pins but not of the taller group pin.
    const zoom = 18;
    const metresPerPoint =
      (156_543.034 * Math.cos((base.lat * Math.PI) / 180)) / 2 ** zoom;
    const point = (id: string, x: number, y: number) =>
      at(id, -y * metresPerPoint, x * metresPerPoint);
    const a = point("a", -18, 0);
    const b = point("b", 18, 0);
    const c = point("c", 0, -(GROUP_PIN.height - 2));
    expect(ids(groupPins([a, c], zoom, NUMBER_PIN))).toEqual([["a"], ["c"]]);
    expect(ids(groupPins([a, b, c], zoom, NUMBER_PIN))).toEqual([
      ["a", "b", "c"],
    ]);
  });
});
