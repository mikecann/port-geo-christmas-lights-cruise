import { stateDiagram } from "@convex-dev/state-machines";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  systemAdminMutation,
  systemAdminQuery,
} from "../../features/common/auth";
import { competitions } from "../../features/competitions/model";
import type { EntryStateKind } from "../../features/entries/schema";
import { entry, machines } from "../../machines";

// What the Machines page shows: the app's state machines working on live
// data, for the developer

// The entry machine's diagram, drawn from its rules, and how many of the
// competition's entries are in each state. Unset means the current one.
export const overview = systemAdminQuery
  .input({ competitionId: v.optional(v.id("competitions")) })
  .handler(async (context, input) => {
    const competitionId =
      input.competitionId ?? (await competitions.query(context).current())._id;
    const counts = await Promise.all(
      entry.manifest.states.map(async ({ kind }) => ({
        kind,
        count: (
          await context.db
            .query("entries")
            .withIndex("by_competitionId_and_status", (q) =>
              q
                .eq("competitionId", competitionId)
                // The manifest's kinds are the schema's, as plain strings
                .eq("state.kind", kind as EntryStateKind),
            )
            .collect()
        ).length,
      })),
    );
    return {
      diagram: stateDiagram(entry.manifest, machines.manifests),
      counts,
    };
  })
  .public();

// An entry by the number on its sign. A rejected entry can share a number
// with the one that holds it, so the holder wins.
export const findByNumber = systemAdminQuery
  .input({
    competitionId: v.optional(v.id("competitions")),
    entryNumber: v.number(),
  })
  .handler(async (context, input) => {
    const competitionId =
      input.competitionId ?? (await competitions.query(context).current())._id;
    const withNumber = await context.db
      .query("entries")
      .withIndex("by_competitionId_and_entryNumber", (q) =>
        q
          .eq("competitionId", competitionId)
          .eq("state.entryNumber", input.entryNumber),
      )
      .take(10);
    const found =
      withNumber.find((row) => row.state.kind !== "rejected") ?? withNumber[0];
    return found?._id ?? null;
  })
  .public();

// One entry's state and timers, and what an admin could send it now
export const entryState = systemAdminQuery
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    const row = await context.db.get(input.entryId);
    if (!row) return null;
    const competition = await competitions
      .query(context)
      .forCompetition(row.competitionId)
      .get();
    return {
      _id: row._id,
      year: competition.year,
      state: row.state,
      stateTimers: row.stateTimers.map(({ event, dueAt }) => ({
        event,
        dueAt,
      })),
      // A system admin passes the machine's admin check, so this is the
      // admin's events. The owner's and the server's aren't in it.
      inspection: await entry.inspect(context, row._id),
    };
  })
  .public();

// From the stateMachines component, newest first
export const entryHistory = systemAdminQuery
  .input({ entryId: v.id("entries"), paginationOpts: paginationOptsValidator })
  .handler(async (context, input) =>
    entry.history(context, input.entryId, {
      paginationOpts: input.paginationOpts,
      order: "desc",
    }),
  )
  .public();

const failedTimer = v.object({
  machine: v.string(),
  id: v.string(),
  event: v.string(),
  dueAt: v.number(),
});

// The catalog's operator functions need its internal brand, so these go
// through its internal mutations in convex/machines.ts. That makes
// failedTimers a mutation, so the page asks for it on demand.
export const failedTimers = systemAdminMutation
  .input({})
  .returns(v.array(failedTimer))
  .handler(
    async (context): Promise<(typeof failedTimer.type)[]> =>
      await context.runMutation(internal.machines.failedTimers, {}),
  )
  .public();

export const rearmTimer = systemAdminMutation
  .input({ machine: v.string(), id: v.string(), event: v.string() })
  .handler(async (context, input) => {
    await context.runMutation(internal.machines.rearmTimer, input);
    return null;
  })
  .public();
