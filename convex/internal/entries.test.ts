import { describe, expect, it } from "vitest";
import {
  createConvexTest,
  ensureTestCompetitions,
} from "../features/common/tests/testingHelpers.vitest";
import { internal } from "../_generated/api";

describe("repairCurrentReturningEntryNumbers", () => {
  it("retries a repair after another returning entry frees its number", async () => {
    const t = createConvexTest();

    const { firstEntryId, secondEntryId } = await t.run(async (ctx) => {
      const { past: previousCompetition, current: currentCompetition } =
        await ensureTestCompetitions(ctx);
      const firstUserId = await ctx.db.insert("users", { name: "First" });
      const secondUserId = await ctx.db.insert("users", { name: "Second" });
      const approvedState = {
        kind: "approved" as const,
        submittedAt: Date.now() - 2,
        approvedAt: Date.now() - 1,
        houseAddress: {
          address: "Test Parade",
          lat: 0,
          lng: 0,
          placeId: "test-place",
        },
      };

      await ctx.db.insert("entries", {
        competitionId: previousCompetition._id,
        submittedByUserId: firstUserId,
        state: { ...approvedState, entryNumber: 2, name: "First previous" },
        stateTimers: [],
      });
      await ctx.db.insert("entries", {
        competitionId: previousCompetition._id,
        submittedByUserId: secondUserId,
        state: {
          ...approvedState,
          entryNumber: 3,
          name: "Second previous",
          houseAddress: {
            ...approvedState.houseAddress,
            placeId: "previous-2",
          },
        },
        stateTimers: [],
      });
      const firstEntryId = await ctx.db.insert("entries", {
        competitionId: currentCompetition._id,
        submittedByUserId: firstUserId,
        state: {
          ...approvedState,
          entryNumber: 1,
          name: "First current",
          houseAddress: { ...approvedState.houseAddress, placeId: "current-1" },
        },
        stateTimers: [],
      });
      const secondEntryId = await ctx.db.insert("entries", {
        competitionId: currentCompetition._id,
        submittedByUserId: secondUserId,
        state: {
          ...approvedState,
          entryNumber: 2,
          name: "Second current",
          houseAddress: { ...approvedState.houseAddress, placeId: "current-2" },
        },
        stateTimers: [],
      });

      return { firstEntryId, secondEntryId };
    });

    expect(
      await t.mutation(
        internal.internal.entries.repairCurrentReturningEntryNumbers,
        {},
      ),
    ).toEqual({
      repairedCount: 2,
      conflictCount: 0,
    });
    await t.run(async (ctx) => {
      expect(await ctx.db.get(firstEntryId)).toMatchObject({
        state: { entryNumber: 2 },
      });
      expect(await ctx.db.get(secondEntryId)).toMatchObject({
        state: { entryNumber: 3 },
      });
    });
  });
});
