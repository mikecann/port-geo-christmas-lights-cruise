import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestStorageId,
  createTestUser,
  insertTestVote,
  signInAsTestUser,
} from "../common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../common/tests/testingHelpers.vitest";
import { competitions } from "../competitions/model";
import { aggregateVotes, voteNamespace } from "../votes/lib";

const seedEntryWithEverything = async (
  t: ConvexTest,
  entrantId: Id<"users">,
) => {
  const storageId = await createTestStorageId(t);
  return await t.run(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    const voterId = await ctx.db.insert("users", {});
    const entryId = await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: entrantId,
      status: "approved",
      submittedAt: Date.now(),
      approvedAt: Date.now(),
      entryNumber: 1,
      name: "Twinkle Town",
      houseAddress: { address: "1 Keel Retreat", lat: 0, lng: 0, placeId: "p" },
    });
    const photoIds = [
      await ctx.db.insert("photos", {
        entryId,
        kind: "convex_stored",
        uploadState: { status: "uploaded", storageId, url: "https://x" },
      }),
      await ctx.db.insert("photos", {
        entryId,
        kind: "convex_stored",
        uploadState: {
          status: "uploading",
          uploadStartedAt: Date.now(),
          uploadUrl: "https://upload",
        },
      }),
      await ctx.db.insert("photos", {
        entryId,
        kind: "mock",
        mockPath: "/mock.jpg",
      }),
    ];
    const voteIds = [
      await insertTestVote(ctx, {
        competitionId: competition._id,
        entryId,
        votingUserId: voterId,
        category: "best_display",
      }),
      await insertTestVote(ctx, {
        competitionId: competition._id,
        entryId,
        votingUserId: voterId,
        category: "most_jolly",
      }),
    ];
    return { competitionId: competition._id, entryId, photoIds, voteIds };
  });
};

const expectEverythingGone = async (
  t: ConvexTest,
  seeded: Awaited<ReturnType<typeof seedEntryWithEverything>>,
) => {
  await t.run(async (ctx) => {
    for (const id of [seeded.entryId, ...seeded.photoIds, ...seeded.voteIds])
      expect(await ctx.db.get(id)).toBeNull();
    for (const category of ["best_display", "most_jolly"] as const)
      expect(
        await aggregateVotes.count(ctx, {
          namespace: voteNamespace(seeded.competitionId, category),
        }),
      ).toBe(0);
  });
};

describe("deleting an entry", () => {
  it("removes its photos and votes and takes the votes off the counts", async () => {
    const t = createConvexTest();
    const admin = await createTestUser(t, { user: { isSystemAdmin: true } });
    const entrant = await createTestUser(t);
    const seeded = await seedEntryWithEverything(t, entrant._id);

    await signInAsTestUser(t, admin).mutation(
      api.admin.system.entries.deleteById,
      { entryId: seeded.entryId },
    );

    await expectEverythingGone(t, seeded);
  });

  it("does the same when an admin deletes their own entry", async () => {
    const t = createConvexTest();
    const admin = await createTestUser(t, { user: { isSystemAdmin: true } });
    const seeded = await seedEntryWithEverything(t, admin._id);

    await signInAsTestUser(t, admin).mutation(
      api.admin.system.entries.deleteMine,
      {},
    );

    await expectEverythingGone(t, seeded);
  });
});
