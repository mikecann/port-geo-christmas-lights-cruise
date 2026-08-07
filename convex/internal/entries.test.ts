import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { competitions } from "../features/competitions/model";
import { repairCurrentReturningEntryNumbersForContext } from "./entries";

describe("repairCurrentReturningEntryNumbers", () => {
  it("retries a repair after another returning entry frees its number", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const previousCompetition = await competitions.mutate(ctx).ensureLegacy();
      const currentCompetition = await competitions.mutate(ctx).ensureCurrent();
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
