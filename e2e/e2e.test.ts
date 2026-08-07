import { describe, it, expect } from "vitest";
import { setupE2E } from "./lib";
import { routes } from "../src/routes";
import { api } from "../convex/_generated/api";

const { auth, backend, stagehand, goto, waitFor } = setupE2E();

describe("a public user's experience", () => {
  it("should allow a user to navigate to the entries page and view the entries", async () => {
    await goto();

    const mocks = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      {
        count: 9,
      },
    );

    // This is deliberately a deterministic click. Stagehand v3 can identify this
    // link through act(), but currently drops the returned action before clicking.
    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Stagehand did not create a browser page");
    await page.locator('header a[href="/entries"]').click();

    await waitFor(
      async () =>
        (await page.locator('[data-testid="entry-gallery-card"]').count()) ===
        mocks.length,
      10_000,
    );

    for (const mock of mocks) {
      expect(
        await page
          .locator(
            `[data-testid="entry-gallery-card"][data-entry-number="${mock.entryNumber}"]`,
          )
          .count(),
      ).toBe(1);
    }
  });

  it("should show that voting is closed on an entry page", async () => {
    const mockEntries = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      { count: 3 },
    );

    await goto(routes.entry({ entryId: mockEntries[0].id }));

    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Stagehand did not create a browser page");
    expect(await page.locator('[data-testid="voting-closed"]').count()).toBe(1);
    expect(await page.locator('[data-testid="vote-entry"]').count()).toBe(0);
  });

  it("should keep competition signup available", async () => {
    await goto(routes.competitionDetails());

    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Stagehand did not create a browser page");
    expect(
      await page.locator('[data-testid="competition-prize-pool"]').count(),
    ).toBe(1);
    expect(
      await page.locator('[data-testid="competition-sign-in"]').count(),
    ).toBe(1);
  });

  it("should show that 2026 tickets are coming soon", async () => {
    await goto(routes.tickets());

    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Stagehand did not create a browser page");
    expect(
      await page.locator('[data-testid="tickets-coming-soon"]').count(),
    ).toBe(1);
    expect(
      await page
        .locator("#eventbrite-widget-modal-trigger-1813094407179")
        .count(),
    ).toBe(0);
  });

  it("should allow a user to navigate to the map page and open an entry marker popup", async () => {
    await goto();

    const mockEntries = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      {
        count: 3,
      },
    );

    await stagehand.act("Click the map button from the top bar");

    await stagehand.act(
      `Click the marker for entry number "${mockEntries[0].entryNumber}"`,
      { model: "openai/gpt-5" },
    );

    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Stagehand did not create a browser page");
    await waitFor(
      async () =>
        (await page.locator('a:has-text("View Details")').count()) === 1,
      10_000,
    );
    expect(await page.locator('[data-testid="map-vote-entry"]').count()).toBe(
      0,
    );

    await stagehand.act("Click view details button in the popup that opens", {
      model: "openai/gpt-5",
    });

    expect(stagehand.context.pages()[0]?.url()).toContain(
      routes.entry({ entryId: mockEntries[0].id }).href,
    );
  });
});

describe("voting is paused", () => {
  it("keeps direct vote links read-only", async () => {
    await auth.signInAs({
      email: "test@example.com",
      name: "Test User",
      isSystemAdmin: false,
      isCompetitionAdmin: false,
    });

    const entries = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      {
        count: 1,
      },
    );

    await goto(routes.entryVote({ entryId: entries[0].id }));

    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Stagehand did not create a browser page");
    expect(await page.locator('[data-testid="voting-closed"]').count()).toBe(1);
    expect(await page.locator('[role="dialog"]').count()).toBe(0);
    expect(await page.locator('[data-testid="vote-entry"]').count()).toBe(0);
  });
});

//describe("an entrant's experience", () => {
// it("should allow voting on an entry", async () => {
//   await goto();
//   const me = await auth.signInAs({
//     email: "test@example.com",
//     name: "Test User",
//     isSystemAdmin: false,
//     isCompetitionAdmin: false,
//   });
//   await goto(routes.myEntries());
//   await stagehand.page.act(`Click to enter the competition`);
//   await stagehand.page.act(
//     `Enter '35 Keel Retreat in the House Address Field'`,
//   );
//   await stagehand.page.act(`Select 35 Keel Retreat from the autocomplete`);
//   await stagehand.page.act(`Enter 'Test Entry' in the Entry Name Field`);
//   await stagehand.page.act(`Click the submit button`);
//   await stagehand.page.act(
//     `wait for it to show the entry submission confirmation`,
//   );
//   const entry = await backend.client.mutation(
//     api.testing.testing.findEntryForUser,
//     {
//       userId: me?._id,
//     },
//   );
//   if (!entry) throw new Error("Entry not found");
//   expect(entry.status).toBe("submitted");
//   expect(entry.name).toBe("Test Entry");
//   expect(entry.houseAddress?.address).toBe(
//     "35 Keel Retreat, Geographe WA, Australia",
//   );
// });
// it(
//   "AGENTICALLY should allow voting on an entry",
//   async () => {
//     await goto();
//     const agent = await stagehand.agent();
//     await agent.execute({
//       instruction: `Create an entry for the competition and submit it.
//         You should use '35 Keel Retreat' as the house address.
//         After entering the address you must select the address from the autocomplete to register the address as valid.
//         You should use 'Test Entry' as the entry name.
//         After submitting the entry, wait for the entry submission confirmation to appear and then finish.`,
//       maxSteps: 30,
//     });
//     const entries = await backend.client.query(
//       api.testing.testing.listEntries,
//     );
//     expect(entries.length).toBe(1);
//     const entry = entries[0];
//     expect(entry.status).toBe("submitted");
//   },
//   minutesInMs(5),
// );
//});
