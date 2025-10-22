import { describe, it, expect } from "vitest";
import { z } from "zod";
import { api } from "../convex/_generated/api";
import { routes } from "../src/routes";
import { setupE2E } from "./lib";

describe("a public user's experience", () => {
  const { backend, stagehand, goto } = setupE2E();

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

    await stagehand.page.act("Click the vote button from the top bar");

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
        entryNumber: z.string(),
      }),
    });

    expect(entryTitle).toBe(firstEntry.entryName);
    expect(entryNumber).toBe(firstEntry.entryNumber);
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

    const { entryTitle, entryNumber } = await stagehand.page.extract({
      instruction: "get some of the entry info from the page",
      schema: z.object({
        entryTitle: z.string(),
        entryNumber: z.string(),
      }),
    });

    expect(entryTitle).toBe(mockEntries[0].name);
    expect(entryNumber).toBe(mockEntries[0].entryNumber.toString());
  });
});
