import { afterEach, describe, expect, it, vi } from "vitest";
import { advance, asInternal } from "@convex-dev/state-machines/test";
import { api } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestUser,
  ensureTestCompetitions,
  moveEntryToStatus,
  signInAsTestUser,
} from "../../features/common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../../features/common/tests/testingHelpers.vitest";
import { SUBMITTING_TIMEOUT_MS } from "../../features/entries/machine";
import { entry, machines } from "../../machines";
import { ensure } from "../../../shared/ensure";

const houseAddress = {
  address: "35 Keel Retreat",
  lat: -33.633,
  lng: 115.39,
  placeId: "pid",
};

const setup = async () => {
  const t = createConvexTest();
  const admin = await createTestUser(t, { user: { isSystemAdmin: true } });
  return { t, asAdmin: signInAsTestUser(t, admin) };
};

// An entry by someone else, put straight into a state
const insertEntry = (
  t: ConvexTest,
  state: Doc<"entries">["state"],
  year: "past" | "current" = "current",
) =>
  t.run(async (ctx) => {
    const competition = (await ensureTestCompetitions(ctx))[year];
    return await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: await ctx.db.insert("users", {}),
      state,
      stateTimers: [],
    });
  });

const historyOf = async (
  asAdmin: ReturnType<typeof signInAsTestUser>,
  entryId: Id<"entries">,
) =>
  (
    await asAdmin.query(api.admin.system.machines.entryHistory, {
      entryId,
      paginationOpts: { numItems: 10, cursor: null },
    })
  ).page.map(({ from, event, to, by }) => `${from} ${event} ${to} by ${by}`);

describe("the Machines page", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is only for system admins", async () => {
    const t = createConvexTest();
    const competitionAdmin = await createTestUser(t, {
      user: { isCompetitionAdmin: true },
    });
    const asCompetitionAdmin = signInAsTestUser(t, competitionAdmin);
    const entryId = await insertEntry(t, { kind: "draft" });

    await expect(
      asCompetitionAdmin.query(api.admin.system.machines.overview, {}),
    ).rejects.toThrow("permission");
    await expect(
      asCompetitionAdmin.query(api.admin.system.machines.entryState, {
        entryId,
      }),
    ).rejects.toThrow("permission");
    await expect(
      asCompetitionAdmin.query(api.admin.system.machines.entryHistory, {
        entryId,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow("permission");
    await expect(
      asCompetitionAdmin.query(api.admin.system.machines.failedTimers, {}),
    ).rejects.toThrow("permission");
    await expect(
      asCompetitionAdmin.mutation(api.admin.system.machines.rearmTimer, {
        machine: "entry",
        id: entryId,
        event: "TIMED_OUT",
      }),
    ).rejects.toThrow("permission");
  });

  it("counts the competition's entries in each state", async () => {
    const { t, asAdmin } = await setup();
    await insertEntry(t, { kind: "draft" });
    await insertEntry(t, { kind: "draft", name: "Half done" });
    await insertEntry(t, {
      kind: "submitted",
      submittedAt: Date.now(),
      houseAddress,
      name: "Waiting",
    });
    // Last year's don't count towards this year's
    await insertEntry(
      t,
      {
        kind: "approved",
        submittedAt: Date.now(),
        approvedAt: Date.now(),
        entryNumber: 1,
        houseAddress,
        name: "Last year",
      },
      "past",
    );

    const { counts, diagram } = await asAdmin.query(
      api.admin.system.machines.overview,
      {},
    );
    expect(counts).toEqual([
      { kind: "draft", count: 2 },
      { kind: "submitting", count: 0 },
      { kind: "submitted", count: 1 },
      { kind: "approved", count: 0 },
      { kind: "rejected", count: 0 },
    ]);
    expect(diagram).toContain("stateDiagram-v2");
    expect(diagram).toContain("submitted --> rejected");
  });

  it("finds an entry by its number and shows its history, newest first", async () => {
    const { t, asAdmin } = await setup();
    const entryId = await insertEntry(t, { kind: "draft" });
    await moveEntryToStatus(t, {
      entryId,
      status: "submitted",
      overrides: { entryNumber: 42 },
    });
    expect(await historyOf(asAdmin, entryId)).toEqual([]);

    await asAdmin.mutation(api.admin.competition.entries.reject, {
      entryId,
      rejectedReason: "Not a house",
    });
    await asAdmin.mutation(api.admin.competition.entries.reopen, { entryId });

    expect(await historyOf(asAdmin, entryId)).toEqual([
      "rejected REOPEN submitted by admin",
      "submitted REJECT rejected by admin",
    ]);
    // Reopening let go of the number
    expect(
      await asAdmin.query(api.admin.system.machines.findByNumber, {
        entryNumber: 42,
      }),
    ).toBeNull();

    await asAdmin.mutation(api.admin.competition.entries.approve, { entryId });
    const { state } = await t.run(async (ctx) =>
      ensure(await ctx.db.get(entryId)),
    );
    if (state.kind !== "approved") throw new Error("Expected it approved");
    expect(
      await asAdmin.query(api.admin.system.machines.findByNumber, {
        entryNumber: state.entryNumber,
      }),
    ).toBe(entryId);
    expect(
      await asAdmin.query(api.admin.system.machines.entryState, { entryId }),
    ).toMatchObject({
      state: { kind: "approved", entryNumber: state.entryNumber },
      stateTimers: [],
      inspection: { kind: "approved" },
    });
  });

  it("finds the entry holding a number past any number of rejected ones", async () => {
    const { t, asAdmin } = await setup();
    const rejected = {
      kind: "rejected" as const,
      rejectedAt: Date.now(),
      rejectedReason: "Not in Port Geographe",
      submittedAt: Date.now(),
      houseAddress,
      name: "Elsewhere",
      entryNumber: 5,
    };
    for (let i = 0; i < 11; i++) await insertEntry(t, rejected);
    const holder = await insertEntry(t, {
      kind: "approved",
      submittedAt: Date.now(),
      approvedAt: Date.now(),
      entryNumber: 5,
      houseAddress,
      name: "Twinkle Town",
    });
    expect(
      await asAdmin.query(api.admin.system.machines.findByNumber, {
        entryNumber: 5,
      }),
    ).toBe(holder);
  });

  it("shows a pending timer, and rearms it", async () => {
    vi.useFakeTimers();
    const { t, asAdmin } = await setup();
    const entryId = await insertEntry(t, {
      kind: "submitting",
      houseAddress: { address: houseAddress.address, placeId: "pid" },
      name: "Stuck",
    });
    await t.run(async (ctx) =>
      entry.armTimers(await asInternal(machines, ctx), entryId),
    );
    expect(
      await asAdmin.query(api.admin.system.machines.entryState, { entryId }),
    ).toMatchObject({
      stateTimers: [
        { event: "TIMED_OUT", dueAt: Date.now() + SUBMITTING_TIMEOUT_MS },
      ],
    });
    expect(
      await asAdmin.query(api.admin.system.machines.failedTimers, {}),
    ).toEqual([]);

    await asAdmin.mutation(api.admin.system.machines.rearmTimer, {
      machine: "entry",
      id: entryId,
      event: "TIMED_OUT",
    });
    await advance(t, SUBMITTING_TIMEOUT_MS);

    expect(
      await asAdmin.query(api.admin.system.machines.entryState, { entryId }),
    ).toMatchObject({ state: { kind: "draft" }, stateTimers: [] });
    expect(await historyOf(asAdmin, entryId)).toEqual([
      "submitting TIMED_OUT draft by timer",
    ]);
  });
});
