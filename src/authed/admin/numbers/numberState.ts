import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";

export type NumberRow = FunctionReturnType<
  typeof api.admin.competition.numbers.list
>["numbers"][number];

// An entry not approved yet still holds its number, so it counts as in use.
// The table says which entries are approved.
export type NumberState = "inUse" | "kept" | "free";

export const NUMBER_STATES: Record<
  NumberState,
  { label: string; color: string }
> = {
  inUse: { label: "In use", color: "green" },
  kept: { label: "Kept", color: "blue" },
  free: { label: "Free", color: "gray" },
};

export const stateOf = (row: NumberRow): NumberState => {
  if (row.holder) return "inUse";
  if (row.reservedFor) return "kept";
  return "free";
};

// Something an admin should sort out: a number in use with no sign printed
export const needsAttention = (row: NumberRow) =>
  row.isOutsideRange && stateOf(row) !== "free";

// "2, 4, 6, 10–11, 14–17": runs of free numbers read as ranges, so a long
// list of them stays one line
export function collapseRuns(numbers: number[]) {
  const runs: string[] = [];
  let start = numbers[0];
  let prev = numbers[0];
  for (const n of [...numbers.slice(1), Number.NaN]) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    if (start !== undefined)
      runs.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = n;
    prev = n;
  }
  return runs.join(", ");
}
