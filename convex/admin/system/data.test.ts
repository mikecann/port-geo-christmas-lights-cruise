import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestStorageId,
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

const seedEntryWithPhotoAndVote = async (
  t: ConvexTest,
  competitionId: Id<"competitions">,
) => {
  const storageId = await createTestStorageId(t);
  return await t.run(async (ctx) => {
    const entrantId = await ctx.db.insert("users", {});
    const voterId = await ctx.db.insert("users", {});
    const entryId = await ctx.db.insert("entries", {
      competitionId,
      submittedByUserId: entrantId,
      status: "approved",
      submittedAt: Date.now(),
      approvedAt: Date.now(),
      entryNumber: 1,
      name: "Twinkle Town",
      houseAddress,
    });
    const photoId = await ctx.db.insert("photos", {
      entryId,
      kind: "convex_stored",
      uploadState: { status: "uploaded", storageId, url: "https://x" },
    });
    const voteId = await ctx.db.insert("votes", {
      competitionId,
      entryId,
      votingUserId: voterId,
      category: "best_display",
    });
    return { entrantId, voterId, entryId, photoId, voteId, storageId };
  });
};

const setup = async () => {
  const t = createConvexTest();
  const admin = await createTestUser(t, { user: { isSystemAdmin: true } });
  const { legacyId, currentId } = await t.run(async (ctx) => ({
    legacyId: (await competitions.query(ctx).forYear(2025).get())._id,
    currentId: (await competitions.query(ctx).current())._id,
  }));
  const past = await seedEntryWithPhotoAndVote(t, legacyId);
  const current = await seedEntryWithPhotoAndVote(t, currentId);
  return { t, asAdmin: signInAsTestUser(t, admin), admin, past, current };
};

const exists = (
  t: ConvexTest,
  id: Id<"users" | "entries" | "photos" | "votes">,
) => t.run(async (ctx) => (await ctx.db.get(id)) !== null);

const fileExists = (t: ConvexTest, id: Id<"_storage">) =>
  t.run(async (ctx) => (await ctx.db.system.get(id)) !== null);

describe("system wipes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuse to run unless ALLOW_DESTRUCTIVE_WIPES is true", async () => {
    const { t, asAdmin, current } = await setup();
    vi.stubEnv("ALLOW_DESTRUCTIVE_WIPES", "yes");

    expect(await asAdmin.query(api.admin.system.data.wipesAllowed, {})).toBe(
      false,
    );
    for (const wipe of [
      api.admin.system.data.wipeAllData,
      api.admin.system.entries.wipeCurrentCompetition,
      api.admin.system.votes.wipeCurrentCompetition,
    ])
      await expect(asAdmin.mutation(wipe, {})).rejects.toThrow(
        "Wipes are turned off on this deployment",
      );

    expect(await exists(t, current.entryId)).toBe(true);
    expect(await exists(t, current.voteId)).toBe(true);
  });

  it("resets only the current competition when allowed", async () => {
    const { t, asAdmin, admin, past, current } = await setup();
    vi.stubEnv("ALLOW_DESTRUCTIVE_WIPES", "true");
    const orphanFile = await createTestStorageId(t);

    expect(await asAdmin.query(api.admin.system.data.wipesAllowed, {})).toBe(
      true,
    );
    await asAdmin.mutation(api.admin.system.data.wipeAllData, {});

    for (const id of [
      past.entryId,
      past.photoId,
      past.voteId,
      past.entrantId,
      past.voterId,
      admin._id,
    ])
      expect(await exists(t, id)).toBe(true);
    expect(await fileExists(t, past.storageId)).toBe(true);

    for (const id of [
      current.entryId,
      current.photoId,
      current.voteId,
      current.entrantId,
      current.voterId,
    ])
      expect(await exists(t, id)).toBe(false);
    expect(await fileExists(t, current.storageId)).toBe(false);
    expect(await fileExists(t, orphanFile)).toBe(false);
  });

  it("wipe current entries and votes without touching past ones", async () => {
    const { t, asAdmin, past, current } = await setup();
    vi.stubEnv("ALLOW_DESTRUCTIVE_WIPES", "true");

    await asAdmin.mutation(api.admin.system.entries.wipeCurrentCompetition, {});
    await asAdmin.mutation(api.admin.system.votes.wipeCurrentCompetition, {});

    expect(await exists(t, past.entryId)).toBe(true);
    expect(await exists(t, past.photoId)).toBe(true);
    expect(await exists(t, past.voteId)).toBe(true);
    expect(await fileExists(t, past.storageId)).toBe(true);
    expect(await exists(t, current.entryId)).toBe(false);
    expect(await exists(t, current.voteId)).toBe(false);
  });

  it("won't delete a single entry from a past competition", async () => {
    const { t, asAdmin, past, current } = await setup();

    await expect(
      asAdmin.mutation(api.admin.system.entries.deleteById, {
        entryId: past.entryId,
      }),
    ).rejects.toThrow("Entries from past competitions are kept");
    expect(await exists(t, past.entryId)).toBe(true);

    await asAdmin.mutation(api.admin.system.entries.deleteById, {
      entryId: current.entryId,
    });
    expect(await exists(t, current.entryId)).toBe(false);
  });
});
