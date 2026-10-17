import { describe, expect, it } from "vitest";
import {
  createConvexTest,
  ensureTestCompetitions,
} from "../features/common/tests/testingHelpers.vitest";
import { repairCurrentReturningEntryNumbersForContext } from "./entries";

describe("repairCurrentReturningEntryNumbers", () => {
  it("retries a repair after another returning entry frees its number", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      const { past: previousCompetition, current: currentCompetition } =
        await ensureTestCompetitions(ctx);
      const firstUserId = await ctx.db.insert("users", { name: "First" });
      const secondUserId = await ctx.db.insert("users", { name: "Second" });
      const entryDetails = {
        status: "approved" as const,
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
        ...entryDetails,
        competitionId: previousCompetition._id,
        submittedByUserId: firstUserId,
        entryNumber: 2,
        name: "First previous",
      });
      await ctx.db.insert("entries", {
        ...entryDetails,
        competitionId: previousCompetition._id,
        submittedByUserId: secondUserId,
        entryNumber: 3,
        name: "Second previous",
        houseAddress: { ...entryDetails.houseAddress, placeId: "previous-2" },
      });
      const firstEntryId = await ctx.db.insert("entries", {
        ...entryDetails,
        competitionId: currentCompetition._id,
        submittedByUserId: firstUserId,
        entryNumber: 1,
        name: "First current",
        houseAddress: { ...entryDetails.houseAddress, placeId: "current-1" },
      });
      const secondEntryId = await ctx.db.insert("entries", {
        ...entryDetails,
        competitionId: currentCompetition._id,
        submittedByUserId: secondUserId,
        entryNumber: 2,
        name: "Second current",
        houseAddress: { ...entryDetails.houseAddress, placeId: "current-2" },
      });

      expect(await repairCurrentReturningEntryNumbersForContext(ctx)).toEqual({
        repairedCount: 2,
        conflictCount: 0,
      });
      expect(await ctx.db.get(firstEntryId)).toMatchObject({ entryNumber: 2 });
      expect(await ctx.db.get(secondEntryId)).toMatchObject({ entryNumber: 3 });
    });
  });
});
