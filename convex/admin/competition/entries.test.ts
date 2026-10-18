import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestUser,
  signInAsTestUser,
  ensureTestCompetitions,
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
  const detail = await signInAsTestUser(t, admin).query(
    api.admin.competition.entries.get,
    { entryId },
  );
  return { isReturningEntrant: detail?.previous != null };
};

describe("returning entrant flag", () => {
  it("is set when the entrant was approved in an earlier competition", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    await t.run(async (ctx) => {
      const legacy = (await ensureTestCompetitions(ctx)).past;
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
      const legacy = (await ensureTestCompetitions(ctx)).past;
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

describe("admin entry list", () => {
  it("returns one status's entries with their photos and who entered", async () => {
    const t = createConvexTest();
    const entrant = await createTestUser(t, {
      user: { name: "Holly Ivy", email: "holly@example.com" },
    });
    const entryId = await submitCurrentEntry(t, entrant._id);
    const photoId = await t.run(async (ctx) => {
      await ctx.db.insert("entries", {
        competitionId: (await competitions.query(ctx).current())._id,
        submittedByUserId: await ctx.db.insert("users", {}),
        status: "rejected",
        submittedAt: Date.now(),
        rejectedAt: Date.now(),
        rejectedReason: "Outside the area",
        name: "Rejected",
        houseAddress: { ...houseAddress, placeId: "other" },
      });
      return await ctx.db.insert("photos", {
        entryId,
        kind: "mock",
        mockPath: "1.jpg",
      });
    });
    const admin = await createTestUser(t, {
      user: { isCompetitionAdmin: true },
    });

    const pending = await signInAsTestUser(t, admin).query(
      api.admin.competition.entries.list,
      { status: "submitted" },
    );

    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      _id: entryId,
      submitter: { name: "Holly Ivy", email: "holly@example.com" },
    });
    expect(pending[0].photos.map((photo) => photo._id)).toEqual([photoId]);
  });
});
