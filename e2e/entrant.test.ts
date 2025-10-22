import { describe, it, expect } from "vitest";
import { setupE2E } from "./lib";
import { routes } from "../src/routes";
import z from "zod";
import { api } from "../convex/_generated/api";

describe("an entrant's experience", () => {
  const { auth, backend, frontend, stagehand, goto } = setupE2E();

  it("should allow a user to submit an entry", async () => {
    await goto();

    const me = await auth.signInAs({
      email: "test@example.com",
      name: "Test User",
      isSystemAdmin: false,
      isCompetitionAdmin: false,
    });

    await goto(routes.myEntries());

    await stagehand.page.act(`Click to enter the competition`);

    await stagehand.page.act(
      `Enter '35 Keel Retreat in the House Address Field'`,
    );

    await stagehand.page.act(`Select 35 Keel Retreat from the autocomplete`);

    await stagehand.page.act(`Enter 'Test Entry' in the Entry Name Field`);

    await stagehand.page.act(`Click the submit button`);

    const entry = await backend.client.mutation(
      api.testing.testing.findEntryForUser,
      {
        userId: me?._id,
      },
    );

    if (!entry) throw new Error("Entry not found");

    expect(entry.status).toBe("submitted");
  });
});
