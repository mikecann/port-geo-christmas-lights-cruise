import type { VoteCategory } from "../../convex/features/votes/schema";

// Mantine colours for strings of Christmas lights, in order along the string
export const BULB_COLORS = ["red-6", "green-6", "yellow-5", "blue-5"];

// Most jolly gets the old red and green
const JOLLY_COLORS = ["red-6", "green-6"];

// How long a vote that's just gone in lights up its button, a little over the
// CSS so the last bulb has faded before the string goes
export const VOTE_LIGHTS_MS = 1450;

// The colour of each bulb around a vote button, from the first one lit
export const voteBulbColors = (category: VoteCategory, count: number) => {
  const colors = category === "most_jolly" ? JOLLY_COLORS : BULB_COLORS;
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};

export type Point = { x: number; y: number };

// Bulbs evenly spaced round a rounded rectangle, `offset` outside its edge,
// clockwise from the middle of the top. Relative to the rectangle's top left,
// so the ones above and left of it are negative. As many as fit about
// `spacing` apart, and never fewer than four.
export function bulbsAroundRect({
  width,
  height,
  radius,
  offset,
  spacing,
}: {
  width: number;
  height: number;
  radius: number;
  offset: number;
  spacing: number;
}): Point[] {
  const left = -offset;
  const top = -offset;
  const right = width + offset;
  const bottom = height + offset;
  const r = Math.max(
    0,
    Math.min(radius + offset, (right - left) / 2, (bottom - top) / 2),
  );
  const across = right - left - 2 * r;
  const down = bottom - top - 2 * r;
  const arc = (Math.PI * r) / 2;
  const corner =
    (cx: number, cy: number, from: number) =>
    (t: number): Point => {
      const angle = from + (t * Math.PI) / 2;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };
  // Clockwise from the top left, where the top edge starts
  const sides: { length: number; at: (t: number) => Point }[] = [
    { length: across, at: (t) => ({ x: left + r + t * across, y: top }) },
    { length: arc, at: corner(right - r, top + r, -Math.PI / 2) },
    { length: down, at: (t) => ({ x: right, y: top + r + t * down }) },
    { length: arc, at: corner(right - r, bottom - r, 0) },
    { length: across, at: (t) => ({ x: right - r - t * across, y: bottom }) },
    { length: arc, at: corner(left + r, bottom - r, Math.PI / 2) },
    { length: down, at: (t) => ({ x: left, y: bottom - r - t * down }) },
    { length: arc, at: corner(left + r, top + r, Math.PI) },
  ];
  const perimeter = sides.reduce((sum, side) => sum + side.length, 0);
  const count = Math.max(4, Math.round(perimeter / spacing));

  return Array.from({ length: count }, (_, i) => {
    let along = (across / 2 + (i * perimeter) / count) % perimeter;
    for (const side of sides) {
      if (along <= side.length && side.length > 0)
        return side.at(along / side.length);
      along -= side.length;
    }
    return sides[0].at(0);
  });
}
