// Moves entries from the old shape, where the whole row was a union keyed on
// `status`, to the entry machine's `state` and `stateTimers`. The steps and
// the deploys between them are in docs/state-machine-migration.md.
//
// These go round the machine on purpose: no guards, no effects, no history.
// That's why they're built with Convex's own internalMutation, as the
// catalog's refuses these writes. Each does one page and schedules the next,
// and running one again only changes the rows that need it.
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
// eslint-disable-next-line no-restricted-imports -- a migration has to write the machine's state directly, which the catalog's builders refuse. It doesn't touch votes, so the triggers aren't needed.
import { internalMutation } from "../_generated/server";

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

// A row in any of the three deploys' shapes
type AnyEntryRow = { _id: Id<"entries">; state?: unknown } & Partial<
  Record<(typeof OLD_ENTRY_FIELDS)[number], unknown>
>;

export const pageArgs = {
  cursor: v.optional(v.union(v.string(), v.null())),
  batchSize: v.optional(v.number()),
};
export const pageResult = v.object({
  updated: v.number(),
  isDone: v.boolean(),
});

// Removes the old top-level fields, once deploy 2 is live. Every row has a
// state by then, as deploy 2's schema requires one.
export const stripOldFields = internalMutation({
  args: pageArgs,
  returns: pageResult,
  handler: async (ctx, { cursor, batchSize = 100 }) => {
    const page = await ctx.db
      .query("entries")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let updated = 0;
    for (const row of page.page as AnyEntryRow[]) {
      if (row.state === undefined) continue;
      const present = OLD_ENTRY_FIELDS.filter((field) => field in row);
      if (!present.length) continue;
      // Patching a field to undefined removes it. The final schema doesn't
      // have these fields, so the value is built loosely.
      const removal = Object.fromEntries(
        present.map((field) => [field, undefined]),
      );
      // eslint-disable-next-line machines/no-direct-state-writes -- removes the old top-level fields, none of which is the machine's state or timers
      await ctx.db.patch("entries", row._id, removal as never);
      updated++;
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.entryState.stripOldFields,
        { cursor: page.continueCursor, batchSize },
      );
    return { updated, isDone: page.isDone };
  },
});
