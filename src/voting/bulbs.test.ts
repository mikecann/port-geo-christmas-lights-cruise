import { describe, expect, it } from "vitest";
import { bulbsAroundRect, voteBulbColors, type Point } from "./bulbs";

describe("voteBulbColors", () => {
  it("runs through all the colours for best display", () => {
    expect(voteBulbColors("best_display", 6)).toEqual([
      "red-6",
      "green-6",
      "yellow-5",
      "blue-5",
      "red-6",
      "green-6",
    ]);
  });

  it("alternates red and green for most jolly", () => {
    const colors = voteBulbColors("most_jolly", 9);
    expect(colors).toHaveLength(9);
    colors.forEach((color, i) =>
      expect(color).toBe(i % 2 === 0 ? "red-6" : "green-6"),
    );
  });
});

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// How far a point is from the outline of a rounded rectangle, from its
// nearest corner's centre once that's been pulled in by the radius
const offOutline = (
  { x, y }: Point,
  rect: { left: number; top: number; right: number; bottom: number },
  r: number,
) => {
  const cx = Math.min(Math.max(x, rect.left + r), rect.right - r);
  const cy = Math.min(Math.max(y, rect.top + r), rect.bottom - r);
  return Math.abs(Math.hypot(x - cx, y - cy) - r);
};

describe("bulbsAroundRect", () => {
  const button = { width: 200, height: 60, radius: 8, offset: 5, spacing: 20 };
  const outline = { left: -5, top: -5, right: 205, bottom: 65 };
  const bulbs = bulbsAroundRect(button);

  it("fits as many as the outline takes at that spacing", () => {
    // Straight sides of 2 * (210 - 26) + 2 * (70 - 26), corners of 2π * 13
    const perimeter = 2 * 184 + 2 * 44 + 2 * Math.PI * 13;
    expect(bulbs).toHaveLength(Math.round(perimeter / 20));
  });

  it("puts every bulb on the outline, outside the button", () => {
    bulbs.forEach((bulb) => {
      expect(offOutline(bulb, outline, 13)).toBeLessThan(1e-9);
      const inside = bulb.x > 0 && bulb.x < 200 && bulb.y > 0 && bulb.y < 60;
      expect(inside).toBe(false);
    });
  });

  it("starts at the middle of the top and goes clockwise", () => {
    expect(bulbs[0].x).toBeCloseTo(100);
    expect(bulbs[0].y).toBeCloseTo(-5);
    expect(bulbs[1].x).toBeGreaterThan(bulbs[0].x);
    const quarter = bulbs[Math.round(bulbs.length / 4)];
    expect(quarter.x).toBeGreaterThan(150);
  });

  it("spaces them evenly round the loop", () => {
    const step = (2 * 184 + 2 * 44 + 2 * Math.PI * 13) / bulbs.length;
    // Measured straight, so a little shorter where they cut a corner
    bulbs.forEach((bulb, i) => {
      const gap = distance(bulb, bulbs[(i + 1) % bulbs.length]);
      expect(gap).toBeLessThanOrEqual(step + 1e-9);
      expect(gap).toBeGreaterThan(step * 0.9);
    });
  });

  it("gives a bigger button more bulbs", () => {
    const small = bulbsAroundRect({ ...button, width: 170, height: 72 });
    const big = bulbsAroundRect({ ...button, width: 358, height: 60 });
    expect(big.length).toBeGreaterThan(small.length);
  });

  it("copes with square corners and a pill", () => {
    const square = bulbsAroundRect({ ...button, radius: 0 });
    expect(square[0]).toEqual({ x: 100, y: -5 });
    expect(square.some((bulb) => bulb.x === 205)).toBe(true);
    const pill = bulbsAroundRect({ ...button, radius: 1000 });
    pill.forEach((bulb) =>
      expect(offOutline(bulb, outline, 35)).toBeLessThan(1e-9),
    );
  });

  it("never has fewer than four", () => {
    expect(
      bulbsAroundRect({ ...button, width: 1, height: 1, offset: 0 }),
    ).toHaveLength(4);
  });
});
