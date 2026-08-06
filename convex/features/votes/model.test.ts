import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { AuthenticatedConvexTest } from "../common/tests/testingHelpers";
import {
  createConvexTestWithUser,
  createTestEntry,
  getTestUser,
} from "../common/tests/testingHelpers";
import { VOTING_CLOSED_MESSAGE } from "../../../shared/eventStatus";

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
    const voteId = await t.run((ctx) =>
      ctx.db.insert("votes", {
        entryId: entry._id,
        votingUserId: user._id,
        category: "most_jolly",
      }),
    );

    await expect(t.mutation(api.my.votes.cancel, { voteId })).rejects.toThrow(
      VOTING_CLOSED_MESSAGE,
    );

    const storedVote = await t.run((ctx) => ctx.db.get(voteId));
    expect(storedVote).not.toBeNull();
  });
});
