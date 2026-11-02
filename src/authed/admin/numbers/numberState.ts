import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";

export type NumberRow = FunctionReturnType<
  typeof api.admin.competition.numbers.list
>["numbers"][number];

export type NumberState = "used" | "pending" | "kept" | "free";

export const NUMBER_STATES: Record<
  NumberState,
  { label: string; color: string }
> = {
  used: { label: "Used by an approved entry", color: "green" },
  pending: { label: "Held by an entry not approved yet", color: "yellow" },
  kept: { label: "Kept for last year's entrant", color: "blue" },
  free: { label: "Free", color: "gray" },
};

export const stateOf = (row: NumberRow): NumberState => {
  if (row.holder) return row.holder.status === "approved" ? "used" : "pending";
  if (row.reservedFor) return "kept";
  return "free";
};

// Something an admin should sort out: a number in use with no sign printed
export const needsAttention = (row: NumberRow) =>
  row.isOutsideRange && stateOf(row) !== "free";
