import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestUser,
  signInAsTestUser,
} from "../../features/common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../../features/common/tests/testingHelpers.vitest";
import { competitions } from "../../features/competitions/model";

const houseAddress = {
  address: "35 Keel Retreat",
  lat: -33.633,
  lng: 115.39,
  placeId: "pid",
};

const submitCurrentEntry = (t: ConvexTest, userId: Id<"users">) =>
  t.run(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    return await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: userId,
      status: "submitted",
      submittedAt: Date.now(),
      name: "This year",
      houseAddress,
    });
  });

const validationFor = async (t: ConvexTest, entryId: Id<"entries">) => {
  const admin = await createTestUser(t, { user: { isCompetitionAdmin: true } });
  return await signInAsTestUser(t, admin).query(
    api.admin.competition.entries.getEntryValidationStatus,
    { entryId },
  );
};

describe("returning entrant flag", () => {
  it("is set when the entrant was approved in an earlier competition", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    await t.run(async (ctx) => {
      const legacy = await competitions.mutate(ctx).ensureLegacy();
      await ctx.db.insert("entries", {
        competitionId: legacy._id,
        submittedByUserId: user._id,
        status: "approved",
        submittedAt: Date.now(),
        approvedAt: Date.now(),
        entryNumber: 3,
        name: "Last year",
        houseAddress,
      });
    });
    const entryId = await submitCurrentEntry(t, user._id);

    expect(await validationFor(t, entryId)).toMatchObject({
      isReturningEntrant: true,
    });
  });

  it("isn't set for someone whose earlier entry wasn't approved", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    await t.run(async (ctx) => {
      const legacy = await competitions.mutate(ctx).ensureLegacy();
      await ctx.db.insert("entries", {
        competitionId: legacy._id,
        submittedByUserId: user._id,
        status: "rejected",
        submittedAt: Date.now(),
        rejectedAt: Date.now(),
        rejectedReason: "Outside the area",
        name: "Last year",
        houseAddress,
      });
    });
    const entryId = await submitCurrentEntry(t, user._id);

    expect(await validationFor(t, entryId)).toMatchObject({
      isReturningEntrant: false,
    });
  });

  it("isn't set for a first-time entrant", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    const entryId = await submitCurrentEntry(t, user._id);

    expect(await validationFor(t, entryId)).toMatchObject({
      isReturningEntrant: false,
    });
  });
});
