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

// How much of the screen a pin covers, in points. Two pins whose boxes
// overlap would hide each other. Only real overlaps count, so zoomed out
// most houses still show their own number.
export interface PinSize {
  width: number;
  height: number;
}
export const NUMBER_PIN: PinSize = { width: 40, height: 24 };
export const PHOTO_PIN: PinSize = { width: 56, height: 60 };

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
// overlapping: 1 or less means they don't overlap now
function crowding(a: PinPoint, b: PinPoint, zoom: number, size: PinSize) {
  const pa = toPixels(a.lat, a.lng, zoom);
  const pb = toPixels(b.lat, b.lng, zoom);
  return Math.min(
    size.width / Math.abs(pa.x - pb.x),
    size.height / Math.abs(pa.y - pb.y),
  );
}

// Pins that overlap join a group, and so do the pins overlapping those, so
// no two pins left on screen hide each other. Groups keep the input order.
export function groupPins<T extends PinPoint>(
  points: T[],
  zoom: number,
  size: PinSize,
): PinGroup<T>[] {
  const groupOf = points.map((_, i) => i);
  const root = (i: number): number =>
    groupOf[i] === i ? i : (groupOf[i] = root(groupOf[i]));

  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      if (crowding(points[i], points[j], zoom, size) > 1)
        groupOf[root(j)] = root(i);

  const byRoot = new Map<number, T[]>();
  points.forEach((point, i) => {
    const members = byRoot.get(root(i)) ?? [];
    members.push(point);
    byRoot.set(root(i), members);
  });

  return [...byRoot.values()].map((members) => ({
    members,
    lat: members.reduce((sum, m) => sum + m.lat, 0) / members.length,
    lng: members.reduce((sum, m) => sum + m.lng, 0) / members.length,
  }));
}

// The zoom at which no two of the group's houses overlap as photo pins
export function zoomToSplit(members: PinPoint[], zoom: number): number {
  let most = 0;
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++)
      most = Math.max(most, crowding(members[i], members[j], zoom, PHOTO_PIN));
  return zoom + Math.log2(most);
}

// Where a tap on a group pin takes the map: in far enough to split the group,
// but not past what still fits all its houses on screen, so a big group opens
// up in steps. Null when the houses are too close to split from here: list them.
export function zoomForGroupTap(
  members: PinPoint[],
  zoom: number,
  screen: { width: number; height: number },
  padding = 60,
): number | null {
  const split = zoomToSplit(members, zoom);

  const pixels = members.map((m) => toPixels(m.lat, m.lng, zoom));
  const spanX =
    Math.max(...pixels.map((p) => p.x)) - Math.min(...pixels.map((p) => p.x));
  const spanY =
    Math.max(...pixels.map((p) => p.y)) - Math.min(...pixels.map((p) => p.y));
  const fitX =
    spanX > 0 ? Math.log2((screen.width - 2 * padding) / spanX) : Infinity;
  const fitY =
    spanY > 0 ? Math.log2((screen.height - 2 * padding) / spanY) : Infinity;
  const fits = zoom + Math.min(fitX, fitY);

  if (split > MAX_SPLIT_ZOOM) {
    // Some of these houses can never be told apart, but if the group is
    // spread out, zooming in still opens up the rest of it
    const splitsAtAll =
      groupPins(members, MAX_SPLIT_ZOOM, PHOTO_PIN).length > 1;
    if (splitsAtAll && zoom < MAX_SPLIT_ZOOM)
      return Math.min(MAX_SPLIT_ZOOM, Math.max(zoom + 1, Math.floor(fits)));
    return null;
  }

  // The satellite map only zooms in whole steps, so round up to the step
  // that splits the group and down to the one that still fits it
  const target = Math.min(Math.floor(fits), Math.ceil(split));
  return Math.min(MAX_SPLIT_ZOOM, Math.max(zoom + 1, target));
}
