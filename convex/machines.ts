import {
  defineMachines,
  deliveryArgs,
  type AppCtx,
  type InternalCtx,
  type Machines,
} from "@convex-dev/state-machines";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
/* eslint-disable no-restricted-imports -- the catalog wraps Convex's own builders. Nothing it builds touches votes, so the vote aggregate's triggers aren't needed. */
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "./_generated/server";
/* eslint-enable no-restricted-imports */
import type { DataModel } from "./_generated/dataModel";
import schema from "./schema";
// Import the machine from here rather than its own module: sending needs the
// catalog, and importing this loads it
import { entry } from "./features/entries/machine";

// Every state machine in the app, checked together when the app loads. The
// app's own mutations stay on fluent-convex (features/common/lib.ts) and send
// role events with their ctx. Only `server` events, purge and the operator's
// functions below need this catalog's internalMutation, which carries the
// internal brand.
export const machines: Machines<typeof schema> = defineMachines(
  schema,
  [entry],
  {
    mutation,
    internalMutation,
    deliver: internal.machines.deliver,
    component: components.stateMachines,
  },
);

export { entry };

// A handler's ctx in machines.internalMutation, for helpers it calls
export type InternalMachineCtx = AppCtx<DataModel> &
  InternalCtx & {
    runMutation: MutationCtx["runMutation"];
    runQuery: MutationCtx["runQuery"];
  };

// Timers fire through this
export const deliver = machines.internalMutation({
  args: deliveryArgs,
  handler: machines.deliver,
});

// For an operator: timers whose step threw, which stay pending until rearmed
export const failedTimers = machines.internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => await machines.failedTimers(ctx, args),
});

export const rearmTimer = machines.internalMutation({
  args: { machine: v.string(), id: v.string(), event: v.string() },
  handler: async (ctx, args) => await machines.rearmTimer(ctx, args),
});
