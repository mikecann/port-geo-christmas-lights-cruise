import { describe, it, expect } from "vitest";
import { setupE2E } from "./lib";
import { routes } from "../src/routes";
import { api } from "../convex/_generated/api";

describe("a voter's experience", () => {
  const { auth, backend, frontend, stagehand, goto } = setupE2E();

  it("should allow a user to submit an entry", async () => {
    await goto();

    const me = await auth.signInAs({
      email: "test@example.com",
      name: "Test User",
      isSystemAdmin: false,
      isCompetitionAdmin: false,
    });

    const entries = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      { count: 1 },
    );

    await goto(routes.entry({ entryId: entries[0].id }));

    await stagehand.page.act(`Click the vote button`);

    await stagehand.page.act(`Click the vote for best display`);

    const votes = await backend.client.query(api.testing.testing.listVotes);

    expect(votes.length).toBe(1);
    expect(votes[0].votingUserId).toBe(me?._id);
    expect(votes[0].entryId).toBe(entries[0].id);
    expect(votes[0].category).toBe("best_display");
  });
});
