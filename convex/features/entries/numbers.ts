import { ConvexError } from "convex/values";
import { randomIntRange } from "../../../shared/num";
import { MAX_ENTRY_NUMBER } from "../../../shared/constants";

export type EntryNumberRange = { min: number; max: number };

// A random free number in the range. When the range is full it's the lowest
// free number above it, which admins see flagged as outside the range.
export function pickEntryNumber(
  range: EntryNumberRange,
  unavailable: Set<number>,
) {
  const free: number[] = [];
  for (let n = range.min; n <= range.max; n++)
    if (!unavailable.has(n)) free.push(n);
  if (free.length > 0) return free[randomIntRange(0, free.length - 1)];

  let next = range.max + 1;
  while (unavailable.has(next)) next++;
  return next;
}

export function isOutsideRange(entryNumber: number, range: EntryNumberRange) {
  return entryNumber < range.min || entryNumber > range.max;
}

export function ensureValidEntryNumber(entryNumber: number) {
  if (
    !Number.isInteger(entryNumber) ||
    entryNumber < 0 ||
    entryNumber > MAX_ENTRY_NUMBER
  )
    throw new ConvexError(
      `Entry numbers must be whole numbers from 0 to ${MAX_ENTRY_NUMBER}.`,
    );
  return entryNumber;
}

export function ensureValidEntryNumberRange(range: EntryNumberRange) {
  ensureValidEntryNumber(range.min);
  ensureValidEntryNumber(range.max);
  if (range.min > range.max)
    throw new ConvexError(
      "The first number must be no bigger than the last number.",
    );
  return range;
}
