import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../schema";
import { entries } from "../entries/model";
import { votes } from "../votes/model";
import { competitions } from "./model";

describe("competition seasons", () => {
  it("can close current-season entry creation without changing other settings", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const current = await competitions.mutate(ctx).ensureCurrent();
      await competitions.mutate(ctx).setEntriesOpen(current._id, false);

      expect(
        await competitions.query(ctx).forCompetition(current._id).get(),
      ).toMatchObject({ entriesOpen: false, votingOpen: false, year: 2026 });
    });
  });

  it("keeps a user's entries separate by season", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const legacy = await competitions.mutate(ctx).ensureLegacy();
      const current = await competitions.mutate(ctx).ensureCurrent();
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

  it("allows one vote per category in each season", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const legacy = await competitions.mutate(ctx).ensureLegacy();
      const current = await competitions.mutate(ctx).ensureCurrent();
      const votingUserId = await ctx.db.insert("users", {
        name: "Seasonal Voter",
      });
      const entrantId = await ctx.db.insert("users", { name: "Entrant" });
      const legacyEntryId = await ctx.db.insert("entries", {
        competitionId: legacy._id,
        submittedByUserId: entrantId,
        status: "draft",
      });
      const currentEntryId = await ctx.db.insert("entries", {
        competitionId: current._id,
        submittedByUserId: entrantId,
        status: "draft",
      });

      await votes.forUser(votingUserId).voteForEntry(ctx.db, {
        competitionId: legacy._id,
        entryId: legacyEntryId,
        category: "best_display",
      });
      await votes.forUser(votingUserId).voteForEntry(ctx.db, {
        competitionId: current._id,
        entryId: currentEntryId,
        category: "best_display",
      });

      await expect(
        votes.forUser(votingUserId).voteForEntry(ctx.db, {
          competitionId: current._id,
          entryId: currentEntryId,
          category: "best_display",
        }),
      ).rejects.toThrow("has already voted");

      expect(
        await votes
          .forUser(votingUserId)
          .hasVotedForCategory(ctx.db, legacy._id, "best_display"),
      ).toBe(true);
      expect(
        await votes
          .forUser(votingUserId)
          .hasVotedForCategory(ctx.db, current._id, "best_display"),
      ).toBe(true);
    });
  });
});
