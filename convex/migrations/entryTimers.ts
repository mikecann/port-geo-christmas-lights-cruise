// After the entry migration (./entryState.ts), for deploy 2 onwards: it
// needs the entry machine.
import { internal } from "../_generated/api";
import { entry, machines } from "../machines";
import { pageArgs, pageResult } from "./entryState";

// Only needed if a backfilled row is in `submitting`: it has no timer yet, so
// nothing would send it back to draft. Arms the timer as if it had just
// entered the state. Needs the machine, so run it once the new code is live.
export const armSubmittingTimers = machines.internalMutation({
  args: pageArgs,
  returns: pageResult,
  handler: async (ctx, { cursor, batchSize = 100 }) => {
    const page = await ctx.db
      .query("entries")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let updated = 0;
    for (const row of page.page)
      if (row.state.kind === "submitting" && !row.stateTimers.length) {
        await entry.armTimers(ctx, row._id);
        updated++;
      }
    if (!page.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.entryTimers.armSubmittingTimers,
        { cursor: page.continueCursor, batchSize },
      );
    return { updated, isDone: page.isDone };
  },
});
