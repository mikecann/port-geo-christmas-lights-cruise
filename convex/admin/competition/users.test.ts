import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import {
  createConvexTest,
  createTestUser,
  ensureTestCompetitions,
  insertTestVote,
  signInAsTestUser,
} from "../../features/common/tests/testingHelpers.vitest";

describe("admin people", () => {
  it("shows each person's entry this year and how many votes they've cast", async () => {
    const t = createConvexTest();
    const admin = await createTestUser(t, {
      user: { isCompetitionAdmin: true, name: "Admin" },
    });
    const { entrantId, entryId, voterId, lastYearEntrantId } = await t.run(
      async (ctx) => {
        const { current, past } = await ensureTestCompetitions(ctx);
        const entrantId = await ctx.db.insert("users", {
          name: "Entrant",
          email: "entrant@example.com",
        });
        const entryId = await ctx.db.insert("entries", {
          competitionId: current._id,
          submittedByUserId: entrantId,
          state: {
            kind: "approved",
            submittedAt: Date.now(),
            approvedAt: Date.now(),
            name: "Twinkle Town",
            houseAddress: {
              address: "1 Keel Retreat",
              lat: -33.633,
              lng: 115.39,
              placeId: "pid",
            },
            entryNumber: 12,
          },
          stateTimers: [],
        });
        const voterId = await ctx.db.insert("users", {
          name: "Voter",
          email: "voter@example.com",
        });
        for (const category of ["best_display", "most_jolly"] as const)
          await insertTestVote(ctx, {
            competitionId: current._id,
            entryId,
            votingUserId: voterId,
            category,
            inPerson: true,
            sawInPerson: true,
            locationCheck: "ok",
            castAt: Date.now(),
          });
        // Only this year counts, so last year's entry doesn't show
        const lastYearEntrantId = await ctx.db.insert("users", {
          name: "Last year",
          email: "last@example.com",
        });
        const lastYearEntryId = await ctx.db.insert("entries", {
          competitionId: past._id,
          submittedByUserId: lastYearEntrantId,
          state: { kind: "draft" },
          stateTimers: [],
        });
        // Nor do last year's votes, so the voter's count stays at 2
        await insertTestVote(ctx, {
          competitionId: past._id,
          entryId: lastYearEntryId,
          votingUserId: voterId,
          category: "best_display",
          inPerson: false,
          sawInPerson: false,
          locationCheck: "no_location",
          castAt: Date.now(),
        });
        return { entrantId, entryId, voterId, lastYearEntrantId };
      },
    );

    const { page } = await signInAsTestUser(t, admin).query(
      api.admin.competition.users.listPage,
      { paginationOpts: { numItems: 10, cursor: null } },
    );
    const byId = new Map(page.map((person) => [person._id, person]));

    expect(byId.get(entrantId)).toMatchObject({
      entry: {
        entryId,
        name: "Twinkle Town",
        entryNumber: 12,
        status: "approved",
      },
      voteCount: 0,
    });
    expect(byId.get(voterId)).toMatchObject({ entry: null, voteCount: 2 });
    expect(byId.get(lastYearEntrantId)).toMatchObject({ entry: null });
    // Admins have their own list, so the page leaves them out
    expect(byId.has(admin._id)).toBe(false);
  });
});
