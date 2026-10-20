// Moves entries from the old shape, where the whole row was a union keyed on
// `status`, to the entry machine's `state` and `stateTimers`. The steps and
// the deploys between them are in docs/state-machine-migration.md.
//
// These go round the machine on purpose: no guards, no effects, no history.
// That's why they're built with Convex's own internalMutation, as the
// catalog's refuses these writes. Each does one page and schedules the next,
// and running one again only changes the rows that need it.
import { v, type Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
// eslint-disable-next-line no-restricted-imports -- a migration has to write the machine's state directly, which the catalog's builders refuse. It doesn't touch votes, so the triggers aren't needed.
import { internalMutation } from "../_generated/server";
import type { entryState } from "../features/entries/schema";

// Read off the validator, so this file works in deploy 1, before the machine
type EntryState = Infer<typeof entryState>;

// The old top-level fields, which each state now keeps inside `state`
export const OLD_ENTRY_FIELDS = [
  "status",
  "name",
  "houseAddress",
  "entryNumber",
  "submittedAt",
  "approvedAt",
  "rejectedAt",
  "rejectedReason",
] as const;

// Each state's own fields, as the old row had them
const FIELDS_BY_STATUS = {
  draft: ["houseAddress", "name", "entryNumber"],
  submitting: ["houseAddress", "name", "entryNumber"],
  submitted: ["submittedAt", "houseAddress", "name", "entryNumber"],
  approved: [
    "submittedAt",
    "approvedAt",
    "entryNumber",
    "houseAddress",
    "name",
  ],
  rejected: [
    "rejectedAt",
    "rejectedReason",
    "submittedAt",
    "houseAddress",
    "name",
    "entryNumber",
  ],
} as const satisfies Record<
  EntryState["kind"],
  readonly (typeof OLD_ENTRY_FIELDS)[number][]
>;

// A row in any of the three deploys' shapes
type AnyEntryRow = { _id: Id<"entries">; state?: unknown } & Partial<
  Record<(typeof OLD_ENTRY_FIELDS)[number], unknown>
>;

// The state an old row was in, with that state's fields. The schema checks
// the result when it's written, so a row that doesn't fit its status fails
// loudly rather than being half moved.
export function stateFromOldFields(row: AnyEntryRow): EntryState {
  const status = row.status as EntryState["kind"] | undefined;
  if (status === undefined || !(status in FIELDS_BY_STATUS))
    throw new Error(`Entry '${row._id}' has no status to move into its state`);
  const fields: Record<string, unknown> = { kind: status };
  for (const field of FIELDS_BY_STATUS[status])
    if (row[field] !== undefined) fields[field] = row[field];
  return fields as EntryState;
}

// Equal as Convex values, whatever order their fields are in.
const canonical = (value: unknown): unknown =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [
            key,
            canonical((value as Record<string, unknown>)[key]),
          ]),
      )
    : Array.isArray(value)
      ? value.map(canonical)
      : value;
const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export const pageArgs = {
  cursor: v.optional(v.union(v.string(), v.null())),
  batchSize: v.optional(v.number()),
};
export const pageResult = v.object({
  updated: v.number(),
  isDone: v.boolean(),
});

// 1. Sets `state` and `stateTimers` from each row's old fields, which it
// leaves in place. It works the state out again on every run, so the last run
// before deploy 2 catches anything the old code changed since the first. Only
// run it before deploy 2: after that the old fields are stale, and `state`
// is the one to trust.
export const backfillState = internalMutation({
  args: pageArgs,
  returns: pageResult,
  handler: async (ctx, { cursor, batchSize = 100 }) => {
    const page = await ctx.db
      .query("entries")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let updated = 0;
    for (const row of page.page as AnyEntryRow[]) {
      if (row.status === undefined) continue;
      const state = stateFromOldFields(row);
      if (row.state !== undefined && sameValue(row.state, state)) continue;
      await ctx.db.patch("entries", row._id, {
        state,
        stateTimers: (row as { stateTimers?: [] }).stateTimers ?? [],
      });
      updated++;
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.entryState.backfillState,
        { cursor: page.continueCursor, batchSize },
      );
    return { updated, isDone: page.isDone };
  },
});
