import type { DataModel } from "../../_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import { aggregateVotes } from "../votes/lib";
import { convex } from "../../schema";

// Using triggers to keep the aggregates up to date automatically for us in our mutations
const triggers = new Triggers<DataModel>();
triggers.register("votes", aggregateVotes.trigger());

// Every mutation, internal ones included, is built from this so the triggers
// always run. A plain convex.mutation() would let the vote counts drift.
// eslint-disable-next-line no-restricted-syntax
export const mutation = convex.mutation().use(
  // eslint-disable-next-line no-restricted-syntax
  convex
    .mutation()
    .createMiddleware(async (context, next) => next(triggers.wrapDB(context))),
);

export const NOT_SIGNED_IN_MESSAGE = "Please sign in and try again.";

// Deterministic shuffle using a provided seed string.
// Uses xmur3 to hash the seed into a number and mulberry32 as the PRNG.
export function shuffleDeterministic<T>(
  items: Array<T>,
  seed: string,
): Array<T> {
  const seedNumber = xmur3(seed)();
  const rng = mulberry32(seedNumber);
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
