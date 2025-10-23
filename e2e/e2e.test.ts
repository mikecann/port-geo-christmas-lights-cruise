import { describe, it, expect } from "vitest";
import { setupE2E } from "./lib";
import { routes } from "../src/routes";
import { api } from "../convex/_generated/api";
import { z } from "zod";
import { minutesInMs } from "../shared/time";

const { auth, backend, frontend, stagehand, goto } = setupE2E();

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

    const votes = await backend.client.query(api.testing.testing.listVotes);

    expect(votes.length).toBe(1);
    expect(votes[0].votingUserId).toBe(me?._id);
    expect(votes[0].entryId).toBe(entries[0].id);
    expect(votes[0].category).toBe("best_display");
  });
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
          
          You should use '35 Keel Retreat' as the house address and 'Test Entry' as the entry name. 
          
          By the way, you need to select the address from the autocomplete to register the address as valid. 
          
          Make sure the entry is in the submitted status before you finish.`,
        maxSteps: 30,
      });

      const entries = await backend.client.query(
        api.testing.testing.listEntries,
      );

      expect(entries.length).toBe(1);
      const entry = entries[0];
      expect(entry.name).toBe("Test Entry");
      expect(entry.status).toBe("submitted");
    },
    minutesInMs(5),
  );
});

describe("a public user's experience", () => {
  it("should allow a user to buy tickets from the homepage", async () => {
    await goto();

    await stagehand.page.act("Click the book tickets now button");

    const button = await stagehand.page.observe("find the Buy Tickets button");

    expect(button.length).toBeGreaterThan(0);
  });

  it("should allow a user to navigate to the entries page and view the entries", async () => {
    await goto();

    await backend.client.mutation(api.testing.testing.createMockEntries, {
      count: 9,
    });

    await stagehand.page.act("Click the entries button from the top bar");

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

    expect(stagehand.page.url()).toContain(routes.signin().href);
  });

  it("should allow a user to navigate to the map page and open an entry marker popup", async () => {
    await goto();

    const mockEntries = await backend.client.mutation(
      api.testing.testing.createMockEntries,
      {
        count: 9,
      },
    );

    await stagehand.page.act("Click the map button from the top bar");

    await stagehand.page.act(
      `Click the marker for entry number "${mockEntries[0].entryNumber}"`,
    );

    await stagehand.page.act(
      `Click view details button in the popup that opens`,
    );

    expect(stagehand.page.url()).toContain(
      routes.entry({ entryId: mockEntries[0].id }).href,
    );
  });
});
