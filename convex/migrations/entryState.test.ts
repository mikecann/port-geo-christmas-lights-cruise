// The backfill runs against deploy 1's schema, which
// docs/state-machine-migration.md spells out: the old union with an optional
// `state` and `stateTimers` on every member.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { machineTimers } from "@convex-dev/state-machines";
import { register } from "@convex-dev/state-machines/test";
import schema from "../schema";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  commonEntryFields,
  draftHomeAddressValidator,
  entryState,
  homeAddressValidator,
} from "../features/entries/schema";

const reservedEntryNumber = v.optional(v.number());
const duringMigration = {
  state: v.optional(entryState),
  stateTimers: v.optional(machineTimers),
};

// Deploy 1: the old union, each member with an optional state beside it
const deploy1Entries = defineTable(
  v.union(
    v.object({
      ...commonEntryFields,
      ...duringMigration,
      status: v.literal("draft"),
      houseAddress: v.optional(draftHomeAddressValidator),
      name: v.optional(v.string()),
      entryNumber: reservedEntryNumber,
    }),
    v.object({
      ...commonEntryFields,
      ...duringMigration,
      status: v.literal("submitting"),
      houseAddress: draftHomeAddressValidator,
      name: v.string(),
      entryNumber: reservedEntryNumber,
    }),
    v.object({
      ...commonEntryFields,
      ...duringMigration,
      status: v.literal("submitted"),
      submittedAt: v.number(),
      houseAddress: homeAddressValidator,
      name: v.string(),
      entryNumber: reservedEntryNumber,
    }),
    v.object({
      ...commonEntryFields,
      ...duringMigration,
      status: v.literal("approved"),
      submittedAt: v.number(),
      approvedAt: v.number(),
      entryNumber: v.number(),
      houseAddress: homeAddressValidator,
      name: v.string(),
    }),
    v.object({
      ...commonEntryFields,
      ...duringMigration,
      status: v.literal("rejected"),
      rejectedAt: v.number(),
      rejectedReason: v.string(),
      submittedAt: v.number(),
      houseAddress: homeAddressValidator,
      name: v.string(),
      entryNumber: reservedEntryNumber,
    }),
  ),
);

const schemaWith = (entries: typeof deploy1Entries) =>
  defineSchema({ ...schema.tables, entries });

const house = { address: "35 Keel Retreat", lat: -33.6, lng: 115.4 };

// One old-shaped row in each status
const oldRows = (
  competitionId: Id<"competitions">,
  submittedByUserId: Id<"users">,
) => [
  { competitionId, submittedByUserId, status: "draft" },
  {
    competitionId,
    submittedByUserId,
    status: "draft",
    name: "Returning",
    houseAddress: { address: "1 Plover Court", placeId: "plover-1" },
    entryNumber: 7,
  },
  {
    competitionId,
    submittedByUserId,
    status: "submitting",
    name: "Stuck",
    houseAddress: { address: "2 Plover Court", placeId: "plover-2" },
  },
  {
    competitionId,
    submittedByUserId,
    status: "submitted",
    submittedAt: 1,
    name: "Waiting",
    houseAddress: { ...house, placeId: "keel-35" },
    entryNumber: 8,
  },
  {
    competitionId,
    submittedByUserId,
    status: "approved",
    submittedAt: 1,
    approvedAt: 2,
    entryNumber: 9,
    name: "Approved",
    houseAddress: { ...house, placeId: "keel-36" },
  },
  {
    competitionId,
    submittedByUserId,
    previousEntryId: undefined,
    status: "rejected",
    submittedAt: 1,
    rejectedAt: 3,
    rejectedReason: "No lights",
    name: "Rejected",
    houseAddress: { ...house, placeId: "keel-37" },
  },
];

const states = [
  { kind: "draft" },
  {
    kind: "draft",
    name: "Returning",
    houseAddress: { address: "1 Plover Court", placeId: "plover-1" },
    entryNumber: 7,
  },
  {
    kind: "submitting",
    name: "Stuck",
    houseAddress: { address: "2 Plover Court", placeId: "plover-2" },
  },
  {
    kind: "submitted",
    submittedAt: 1,
    name: "Waiting",
    houseAddress: { ...house, placeId: "keel-35" },
    entryNumber: 8,
  },
  {
    kind: "approved",
    submittedAt: 1,
    approvedAt: 2,
    entryNumber: 9,
    name: "Approved",
    houseAddress: { ...house, placeId: "keel-36" },
  },
  {
    kind: "rejected",
    submittedAt: 1,
    rejectedAt: 3,
    rejectedReason: "No lights",
    name: "Rejected",
    houseAddress: { ...house, placeId: "keel-37" },
  },
];

describe("the entry state migration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("backfills state from the old fields, page by page, and can run again", async () => {
    const t = convexTest(schemaWith(deploy1Entries));
    register(t);
    await t.run(async (ctx) => {
      const competitionId = await ctx.db.insert("competitions", {
        year: 2026,
        entriesOpen: false,
        votingOpen: false,
      });
      const userId = await ctx.db.insert("users", {});
      // Loosely typed: these rows are in deploy 1's shape, not the app's
      for (const row of oldRows(competitionId, userId))
        await ctx.db.insert("entries", row as never);
    });

    await t.mutation(internal.migrations.entryState.backfillState, {
      batchSize: 4,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.map((row) => row.state)).toEqual(states);
    expect(rows.every((row) => row.stateTimers?.length === 0)).toBe(true);
    // The old fields stay until stripOldFields
    expect(rows.map((row) => (row as { status?: string }).status)).toEqual([
      "draft",
      "draft",
      "submitting",
      "submitted",
      "approved",
      "rejected",
    ]);

    expect(
      await t.mutation(internal.migrations.entryState.backfillState, {}),
    ).toEqual({ updated: 0, isDone: true });
  });

  it("picks up what the old code changed after an earlier run", async () => {
    const t = convexTest(schemaWith(deploy1Entries));
    register(t);
    const submittedId = await t.run(async (ctx) => {
      const competitionId = await ctx.db.insert("competitions", {
        year: 2026,
        entriesOpen: false,
        votingOpen: false,
      });
      const userId = await ctx.db.insert("users", {});
      const ids = [];
      for (const row of oldRows(competitionId, userId))
        ids.push(await ctx.db.insert("entries", row as never));
      return ids[3];
    });
    await t.mutation(internal.migrations.entryState.backfillState, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    // Deploy 1's code approves the submitted entry, writing only its old fields
    await t.run((ctx) =>
      ctx.db.patch("entries", submittedId, {
        status: "approved",
        approvedAt: 5,
        entryNumber: 12,
      } as never),
    );
    expect(
      await t.mutation(internal.migrations.entryState.backfillState, {}),
    ).toEqual({ updated: 1, isDone: true });
    const row = await t.run((ctx) => ctx.db.get("entries", submittedId));
    expect(row?.state).toMatchObject({
      kind: "approved",
      approvedAt: 5,
      entryNumber: 12,
    });
  });
});
