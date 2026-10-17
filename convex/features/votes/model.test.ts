import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { AuthenticatedConvexTest } from "../common/tests/testingHelpers.vitest";
import {
  createConvexTestWithUser,
  createTestEntry,
  getTestUser,
  moveEntryToStatus,
} from "../common/tests/testingHelpers.vitest";
import { VOTING_CLOSED_MESSAGE } from "../../../shared/eventStatus";
import { competitions } from "../competitions/model";

describe("voting pause", () => {
  let t: AuthenticatedConvexTest;

  beforeEach(async () => {
    const testContext = await createConvexTestWithUser();
    t = testContext.t;
  });

  it("rejects new votes and leaves the 2025 records unchanged", async () => {
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");

    await expect(
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
      }),
    ).rejects.toThrow(VOTING_CLOSED_MESSAGE);

    const storedVotes = await t.run((ctx) => ctx.db.query("votes").collect());
    expect(storedVotes).toHaveLength(0);
  });

  it("rejects vote cancellation and preserves the existing vote", async () => {
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    const user = await getTestUser(t);
    const voteId = await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      return await ctx.db.insert("votes", {
        competitionId: competition._id,
        entryId: entry._id,
        votingUserId: user._id,
        category: "most_jolly",
      });
    });

    await expect(t.mutation(api.my.votes.cancel, { voteId })).rejects.toThrow(
      VOTING_CLOSED_MESSAGE,
    );

    const storedVote = await t.run((ctx) => ctx.db.get(voteId));
    expect(storedVote).not.toBeNull();
  });
});

describe("voting while open", () => {
  let t: AuthenticatedConvexTest;

  beforeEach(async () => {
    const testContext = await createConvexTestWithUser();
    t = testContext.t;
    await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      await ctx.db.patch(competition._id, { votingOpen: true });
    });
  });

  it("accepts a vote for an approved entry", async () => {
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "approved" });

    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
    });

    const storedVotes = await t.run((ctx) => ctx.db.query("votes").collect());
    expect(storedVotes).toHaveLength(1);
  });

  it("rejects votes for entries that aren't approved", async () => {
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");

    for (const status of ["draft", "submitted"] as const) {
      await moveEntryToStatus(t, { entryId: entry._id, status });
      await expect(
        t.mutation(api.my.votes.vote, {
          entryId: entry._id,
          category: "best_display",
        }),
      ).rejects.toThrow("Entry is not approved");
    }

    const storedVotes = await t.run((ctx) => ctx.db.query("votes").collect());
    expect(storedVotes).toHaveLength(0);
  });

  it("rejects votes for an approved entry from a past competition", async () => {
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "approved" });
    await t.run(async (ctx) => {
      const legacy = await competitions.mutate(ctx).ensureLegacy();
      await ctx.db.patch(entry._id, { competitionId: legacy._id });
    });

    await expect(
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
      }),
    ).rejects.toThrow("Entry does not belong to the current competition");
  });
});
