import { describe, expect, it } from "vitest";
import {
  createConvexTest,
  ensureTestCompetitions,
} from "../common/tests/testingHelpers.vitest";
import { entries } from "../entries/model";
import { votes } from "../votes/model";
import { competitions } from "./model";

describe("current competition", () => {
  it("is the one with the highest year", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      await ctx.db.insert("competitions", {
        year: 2026,
        entriesOpen: false,
        votingOpen: false,
      });
      const newest = await ctx.db.insert("competitions", {
        year: 2027,
        entriesOpen: true,
        votingOpen: false,
      });
      await ctx.db.insert("competitions", {
        year: 2025,
        entriesOpen: false,
        votingOpen: false,
      });

      expect((await competitions.query(ctx).current())._id).toBe(newest);
    });
  });

  it("says so when no competition has been set up", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      await expect(competitions.query(ctx).current()).rejects.toThrow(
        "No competition has been configured",
      );
    });
  });
});

describe("competition seasons", () => {
  it("can close current-season entry creation without changing other settings", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      await competitions.mutate(ctx).setEntriesOpen(current._id, false);

      expect(
        await competitions.query(ctx).forCompetition(current._id).get(),
      ).toMatchObject({ entriesOpen: false, votingOpen: false, year: 2026 });
    });
  });

  it("keeps a user's entries separate by season", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      const { past: legacy, current } = await ensureTestCompetitions(ctx);
      const userId = await ctx.db.insert("users", { name: "Seasonal Entrant" });

      const legacyEntryId = await entries
        .mutate(ctx)
        .forUser(legacy._id, userId)
        .create();
      const currentEntryId = await entries
        .mutate(ctx)
        .forUser(current._id, userId)
        .create();

      expect(legacyEntryId).not.toBe(currentEntryId);
      expect(
        await entries.query(ctx).forUser(legacy._id, userId).get(),
      ).toMatchObject({ competitionId: legacy._id });
      expect(
        await entries.query(ctx).forUser(current._id, userId).get(),
      ).toMatchObject({ competitionId: current._id });
    });
  });

  it("looks back from the competition it's given, not from the current one", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      const older = await ctx.db.insert("competitions", {
        year: 2024,
        entriesOpen: false,
        votingOpen: false,
      });
      const userId = await ctx.db.insert("users", {});
      const approved = (competitionId: typeof older, entryNumber: number) =>
        ctx.db.insert("entries", {
          competitionId,
          submittedByUserId: userId,
          status: "approved",
          submittedAt: Date.now(),
          approvedAt: Date.now(),
          entryNumber,
          name: `Entry ${entryNumber}`,
          houseAddress: {
            address: "1 Keel Retreat",
            lat: 0,
            lng: 0,
            placeId: "p",
          },
        });
      const olderEntryId = await approved(older, 4);
      const pastEntryId = await approved(past._id, 9);
      await entries.mutate(ctx).forUser(current._id, userId).create();

      const fromCurrent = entries.query(ctx).forUser(current._id, userId);
      expect(
        (await fromCurrent.listPrevious()).map((row) => row.entry._id),
      ).toEqual([pastEntryId, olderEntryId]);
      expect((await fromCurrent.findPreviousApproved())?._id).toBe(pastEntryId);

      const fromPast = entries.query(ctx).forUser(past._id, userId);
      expect(
        (await fromPast.listPrevious()).map((row) => row.entry._id),
      ).toEqual([olderEntryId]);
      expect((await fromPast.findPreviousApproved())?._id).toBe(olderEntryId);
      expect(
        await entries.query(ctx).forUser(older, userId).findPreviousApproved(),
      ).toBeNull();
    });
  });

  it("keeps one vote per person in each season", async () => {
    const t = createConvexTest();

    await t.run(async (ctx) => {
      const { past: legacy, current } = await ensureTestCompetitions(ctx);
      const votingUserId = await ctx.db.insert("users", {
        name: "Seasonal Voter",
      });
      const entrantId = await ctx.db.insert("users", { name: "Entrant" });
      const insertEntry = (competitionId: typeof current._id) =>
        ctx.db.insert("entries", {
          competitionId,
          submittedByUserId: entrantId,
          status: "draft",
        });
      const legacyEntryId = await insertEntry(legacy._id);
      const firstEntryId = await insertEntry(current._id);
      const secondEntryId = await insertEntry(current._id);
      const voter = votes.forUser(votingUserId);
      const voteFor = (
        competitionId: typeof current._id,
        entryId: typeof firstEntryId,
      ) =>
        voter.cast(ctx.db, {
          competitionId,
          entryId,
          category: "best_display",
          inPerson: false,
          sawInPerson: false,
          locationCheck: "no_location",
          castAt: Date.now(),
        });

      // 2025's per-category votes don't stop a 2026 vote
      await ctx.db.insert("votes", {
        competitionId: current._id,
        entryId: legacyEntryId,
        votingUserId,
        category: "best_display",
      });
      await voteFor(legacy._id, legacyEntryId);
      await voteFor(current._id, firstEntryId);
      await voteFor(current._id, secondEntryId);

      expect(
        (await voter.find(ctx.db, current._id, "best_display"))?.entryId,
      ).toBe(secondEntryId);
      expect(
        (await voter.find(ctx.db, legacy._id, "best_display"))?.entryId,
      ).toBe(legacyEntryId);
      const allVotes = await ctx.db.query("votes").collect();
      expect(allVotes).toHaveLength(3);
    });
  });
});
