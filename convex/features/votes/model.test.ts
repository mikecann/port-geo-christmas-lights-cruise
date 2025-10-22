import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../../_generated/api";
import type {
  AuthenticatedConvexTest} from "../common/tests/testingHelpers";
import {
  createConvexTestWithUser,
  createTestEntry,
} from "../common/tests/testingHelpers";

describe("voteForEntry", () => {
  let t: AuthenticatedConvexTest;

  beforeEach(async () => {
    const obj = await createConvexTestWithUser();
    t = obj.t;
  });

  const getAllVotes = () =>
    t.run(async (ctx) => await ctx.db.query("votes").collect());

  it("allows a user to vote for an entry in a category once", async () => {
    // Arrange
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");

    // Act
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
    });

    // Assert
    const votes = await getAllVotes();
    expect(votes).toHaveLength(1);
    expect(votes[0].entryId).toEqual(entry._id);
    expect(votes[0].category).toBe("best_display");
  });

  it("prevents a user from voting twice in the same category", async () => {
    // Arrange
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");

    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
    });

    // Act & Assert
    await expect(
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
      }),
    ).rejects.toThrow(
      /has already voted in category 'best_display' and cannot vote again/,
    );
  });

  it("allows a user to vote once per category across different categories", async () => {
    // Arrange
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");

    // Act
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
    });
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "most_jolly",
    });

    // Assert
    const votes = await getAllVotes();
    expect(votes).toHaveLength(2);
    const categories = votes.map((v) => v.category).sort();
    expect(categories).toEqual(["best_display", "most_jolly"]);
  });

  it("errors when entry does not exist", async () => {
    // Arrange: create a real entry id then delete it
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await t.run(async (ctx) => {
      await ctx.db.delete(entry._id);
    });

    // Act & Assert
    await expect(
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
      }),
    ).rejects.toThrow(/not found/);
  });
});
