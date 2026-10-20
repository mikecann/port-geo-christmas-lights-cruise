// The strip runs against deploy 2's schema, which
// docs/state-machine-migration.md spells out: `state` required, with the old
// fields still allowed until they're stripped.
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

// Deploy 2: state required, the old fields optional until they're stripped
const deploy2Entries = defineTable({
  ...commonEntryFields,
  state: entryState,
  stateTimers: machineTimers,
  status: v.optional(
    v.union(
      v.literal("draft"),
      v.literal("submitting"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  ),
  houseAddress: v.optional(
    v.union(homeAddressValidator, draftHomeAddressValidator),
  ),
  name: v.optional(v.string()),
  entryNumber: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),
  rejectedAt: v.optional(v.number()),
  rejectedReason: v.optional(v.string()),
});

const schemaWith = (entries: typeof deploy2Entries) =>
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

const OLD_FIELDS = [
  "status",
  "name",
  "houseAddress",
  "entryNumber",
  "submittedAt",
  "approvedAt",
  "rejectedAt",
  "rejectedReason",
];

describe("the entry state migration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("strips the old fields once every row has its state", async () => {
    const t = convexTest(schemaWith(deploy2Entries));
    register(t);
    await t.run(async (ctx) => {
      const competitionId = await ctx.db.insert("competitions", {
        year: 2026,
        entriesOpen: false,
        votingOpen: false,
      });
      const userId = await ctx.db.insert("users", {});
      const rows = oldRows(competitionId, userId);
      for (const [index, row] of rows.entries())
        await ctx.db.insert("entries", {
          ...row,
          state: states[index],
          stateTimers: [],
        } as never);
    });

    await t.mutation(internal.migrations.entryState.stripOldFields, {
      batchSize: 4,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await t.run((ctx) => ctx.db.query("entries").collect());
    expect(rows.map((row) => row.state)).toEqual(states);
    for (const row of rows)
      for (const field of OLD_FIELDS) expect(row).not.toHaveProperty(field);
    expect(
      await t.mutation(internal.migrations.entryState.stripOldFields, {}),
    ).toEqual({ updated: 0, isDone: true });
  });

  it("arms the timer of an entry it left in submitting", async () => {
    const t = convexTest(schema);
    register(t);
    const entryId = await t.run(async (ctx) => {
      const competitionId = await ctx.db.insert("competitions", {
        year: 2026,
        entriesOpen: true,
        votingOpen: false,
      });
      return await ctx.db.insert("entries", {
        competitionId,
        submittedByUserId: await ctx.db.insert("users", {}),
        state: {
          kind: "submitting",
          name: "Stuck",
          houseAddress: { address: "2 Plover Court", placeId: "plover-2" },
        },
        stateTimers: [],
      });
    });

    expect(
      await t.mutation(internal.migrations.entryTimers.armSubmittingTimers, {}),
    ).toEqual({ updated: 1, isDone: true });
    const row = await t.run((ctx) => ctx.db.get(entryId));
    expect(row?.stateTimers).toEqual([
      expect.objectContaining({ event: "TIMED_OUT" }),
    ]);
  });
});
