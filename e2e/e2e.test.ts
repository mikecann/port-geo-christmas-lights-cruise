import { describe, it, expect } from "vitest";
import { setupE2E } from "./lib";
import { routes } from "../src/routes";
import { api } from "../convex/_generated/api";
import { z } from "zod";
import { minutesInMs } from "../shared/time";
import { wait } from "../shared/misc";

const { auth, backend, stagehand, goto } = setupE2E();

describe("a public user's experience", () => {
  it("should allow a user to buy tickets from the homepage", async () => {
    await goto();

    await stagehand.page.act("Click the button to buy tickets");

    const button = await stagehand.page.observe("find the Buy Tickets button");

    expect(button.length).toBeGreaterThan(0);
  });

  it("should allow a user to navigate to the entries page and view the entries", async () => {
    await goto();

    await stagehand.page.act("Click the entries button from the top bar");

    await backend.client.mutation(api.testing.testing.createMockEntries, {
      count: 9,
    });

    const { entries } = await stagehand.page.extract({
      instruction: "find the entries listed",
      schema: z.object({
        entries: z.array(
          z.object({
            entryName: z.string(),
            entryNumber: z.string(),
          }),
        ),
      }),
    });

    expect(entries.length).toBe(9);

    const firstEntry = entries[0];

    await stagehand.page.act(
      `Click the entry with the name "${firstEntry.entryName}"`,
    );

    const { entryTitle, entryNumber } = await stagehand.page.extract({
      instruction: "get some of the entry info",
      schema: z.object({
        entryTitle: z.string(),
        entryNumber: z.number(),
      }),
    });

    expect(entryTitle).toBe(firstEntry.entryName);
    expect(entryNumber).toBe(Number(firstEntry.entryNumber));
  });

  it("should allow the user to sign in to vote from the entry page", async () => {
    const mockEntries = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      { count: 3 },
    );

    await goto(routes.entry({ entryId: mockEntries[0].id }));

    await stagehand.page.act("Click the sign in to vote button");

    expect(stagehand.page.url()).toContain(
      routes.signin({ returnTo: "" }).href,
    );
  });

  it("should allow a user to navigate to the map page and open an entry marker popup", async () => {
    await goto();

    const mockEntries = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      {
        count: 9,
      },
    );

    await stagehand.page.act({
      action: "Click the map button from the top bar",
      iframes: true,
    });

    await stagehand.page.act({
      action: `Click the marker for entry number "${mockEntries[0].entryNumber}"`,
      iframes: true,
    });

    await stagehand.page.act({
      action: `Click view details button in the popup that opens`,
      iframes: true,
    });

    expect(stagehand.page.url()).toContain(
      routes.entry({ entryId: mockEntries[0].id }).href,
    );
  });
});

describe("a voter's experience", () => {
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

    await stagehand.page.act(`wait for it to show the vote confirmation`);

    const votes = await backend.client.query(api.testing.testing.listVotes);

    expect(votes.length).toBe(1);
    expect(votes[0].votingUserId).toBe(me?._id);
    expect(votes[0].entryId).toBe(entries[0].id);
    expect(votes[0].category).toBe("best_display");
  });

  it(
    "AGENTICALLY enable voting in the jolly category",
    async () => {
      await goto();

      await auth.signInAs({
        email: "test@example.com",
        name: "Test User",
        isSystemAdmin: false,
        isCompetitionAdmin: false,
      });

      await goto();

      await backend.client.mutation(api.testing.testing.createMockEntries, {
        count: 10,
      });

      const agent = await stagehand.agent();

      await agent.execute({
        instruction: `Vote for any of the entries in the "most jolly" category.

        After voting, wait for the vote confirmation to appear and then finish.`,
        maxSteps: 15,
      });

      await wait(1000);

      const votes = await backend.client.query(api.testing.testing.listVotes);

      expect(votes.length).toBe(1);
      expect(votes[0].category).toBe("most_jolly");
    },
    minutesInMs(5),
  );
});

describe("an entrant's experience", () => {
  it("should allow voting on an entry", async () => {
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

    await stagehand.page.act(
      `wait for it to show the entry submission confirmation`,
    );

    const entry = await backend.client.mutation(
      api.testing.testing.findEntryForUser,
      {
        userId: me?._id,
      },
    );

    if (!entry) throw new Error("Entry not found");

    expect(entry.status).toBe("submitted");
    expect(entry.name).toBe("Test Entry");
    expect(entry.houseAddress?.address).toBe(
      "35 Keel Retreat, Geographe WA, Australia",
    );
  });

  it(
    "AGENTICALLY should allow voting on an entry",
    async () => {
      await goto();

      const agent = await stagehand.agent();

      await agent.execute({
        instruction: `Create an entry for the competition and submit it.

          You should use '35 Keel Retreat' as the house address.

          After entering the address you must select the address from the autocomplete to register the address as valid.

          You should use 'Test Entry' as the entry name.

          After submitting the entry, wait for the entry submission confirmation to appear and then finish.`,
        maxSteps: 30,
      });

      const entries = await backend.client.query(
        api.testing.testing.listEntries,
      );

      expect(entries.length).toBe(1);
      const entry = entries[0];
      expect(entry.status).toBe("submitted");
    },
    minutesInMs(5),
  );
});
