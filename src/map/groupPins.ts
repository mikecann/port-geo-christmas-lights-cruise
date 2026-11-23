// Houses that would sit on top of each other at the current zoom become one
// group pin, so every pin on screen can be tapped. Worked out in screen
// pixels, so the groups split up as you zoom in.

export interface PinPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface PinGroup<T extends PinPoint> {
  members: T[];
  lat: number;
  lng: number;
}

// How much of the screen a pin covers, in points, standing up from the spot
// it marks. Only real overlaps count, so zoomed out most houses still show
// their own number. A pin's 44pt tap area reaches a little past its number;
// stackOrder keeps that edge under the neighbouring numbers.
export interface PinSize {
  width: number;
  height: number;
}
export const NUMBER_PIN: PinSize = { width: 40, height: 28 };
export const PHOTO_PIN: PinSize = { width: 56, height: 62 };
// The group pin: a number-sized pill with a house and the count, plus the
// edge of the pill behind it. Two-digit counts make it wider.
export const groupPinSize = (count: number): PinSize => ({
  width: count >= 10 ? 56 : 48,
  height: 32,
});

// Pins further up the screen go in front: a pin's tap area reaches up past
// its number, and this keeps it under the number of the house above. A
// hovered pin keeps its place too, or its tap area would cover that number.
export const stackOrder = (lat: number) => Math.round((lat + 90) * 10_000);
// The opened pin, and an open list, go in front of everything
export const RAISED_PIN = 10_000_000;

// Past this zoom the satellite photos run out, so a group still too close to
// split shows a list of its houses instead of zooming in
export const MAX_SPLIT_ZOOM = 20;

const TILE_SIZE = 256;

// Web Mercator, the projection Google Maps draws in
export function toPixels(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.min(
    Math.max(Math.sin((lat * Math.PI) / 180), -0.9999),
    0.9999,
  );
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

// How many times further apart two pins must get before they stop
// overlapping: 1 or less means they don't overlap now. Pins stand up from
// their spot, so the one further down the screen is the one that reaches up
// into the other.
function crowding(
  a: { lat: number; lng: number },
  aSize: PinSize,
  b: { lat: number; lng: number },
  bSize: PinSize,
  zoom: number,
) {
  const pa = toPixels(a.lat, a.lng, zoom);
  const pb = toPixels(b.lat, b.lng, zoom);
  const lower = pb.y >= pa.y ? bSize : aSize;
  return Math.min(
    (aSize.width + bSize.width) / 2 / Math.abs(pa.x - pb.x),
    lower.height / Math.abs(pa.y - pb.y),
  );
}

// The middle of the group's houses, so zooming in on it keeps them all in view
function middle(members: PinPoint[]) {
  const lats = members.map((m) => m.lat);
  const lngs = members.map((m) => m.lng);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
}

// Overlapping pins join a group. A group's own pin can then land on another
// pin, so that joins too, until nothing on screen overlaps. Groups keep the
// input order.
export function groupPins<T extends PinPoint>(
  points: T[],
  zoom: number,
  size: PinSize,
): PinGroup<T>[] {
  let groups: PinGroup<T>[] = points.map((p) => ({
    members: [p],
    lat: p.lat,
    lng: p.lng,
  }));
  const sizeOf = (g: PinGroup<T>) =>
    g.members.length > 1 ? groupPinSize(g.members.length) : size;
  const overlap = (a: PinGroup<T>, b: PinGroup<T>) => {
    // Houses that overlap as pins always group, whatever their group pins do
    for (const ma of a.members)
      for (const mb of b.members)
        if (crowding(ma, size, mb, size, zoom) > 1) return true;
    return crowding(a, sizeOf(a), b, sizeOf(b), zoom) > 1;
  };
  const order = (m: T) => points.indexOf(m);

  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < groups.length && !merged; i++)
      for (let j = i + 1; j < groups.length && !merged; j++)
        if (overlap(groups[i], groups[j])) {
          const members = [...groups[i].members, ...groups[j].members].sort(
            (x, y) => order(x) - order(y),
          );
          groups = [
            ...groups.slice(0, i),
            { members, ...middle(members) },
            ...groups.slice(i + 1, j),
            ...groups.slice(j + 1),
          ];
          merged = true;
        }
  }
  return groups;
}

// The zoom at which no two of the group's houses overlap as photo pins
export function zoomToSplit(members: PinPoint[], zoom: number): number {
  let most = 0;
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++)
      most = Math.max(
        most,
        crowding(members[i], PHOTO_PIN, members[j], PHOTO_PIN, zoom),
      );
  return zoom + Math.log2(most);
}

// Where a tap on a group pin takes the map: in far enough to split the group,
// but not past what still fits all its houses on screen, so a big group opens
// up in steps. Null when zooming in can't help (the houses are too close to
// split, or too spread out to zoom in on): list them instead.
export function zoomForGroupTap(
  members: PinPoint[],
  zoom: number,
  screen: { width: number; height: number },
  padding = 60,
): number | null {
  const pixels = members.map((m) => toPixels(m.lat, m.lng, zoom));
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  const fitsIn = (room: number, used: number) =>
    used > 0 ? Math.log2(Math.max(room - 2 * padding, 44) / used) : Infinity;
  const fits =
    zoom +
    Math.min(
      fitsIn(screen.width, span(pixels.map((p) => p.x))),
      fitsIn(screen.height, span(pixels.map((p) => p.y))),
    );

  // The satellite map only zooms in whole steps, so round down to the step
  // that still fits the group, and up to the one that splits it
  const next = Math.floor(zoom) + 1;
  const furthest = Math.min(MAX_SPLIT_ZOOM, Math.floor(fits));
  if (furthest < next) return null;

  const split = zoomToSplit(members, zoom);
  if (split <= MAX_SPLIT_ZOOM)
    return Math.max(next, Math.min(furthest, Math.ceil(split)));

  // Some of these houses can never be told apart, but if the group is
  // spread out, zooming in still opens up the rest of it
  const splitsAtAll = groupPins(members, MAX_SPLIT_ZOOM, PHOTO_PIN).length > 1;
  return splitsAtAll ? furthest : null;
}
