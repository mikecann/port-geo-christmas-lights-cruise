import { describe, expect, it } from "vitest";
import { createPendingVotes, pendingVoteAction } from "./pendingVote";
import type { VoteCategory } from "../../convex/features/votes/schema";
import type { MyVote, MyVotes, VoteFlowStep } from "./useVoteFlow";

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
};

const setup = () => {
  const storage = memoryStorage();
  let time = 1_000_000;
  const pending = createPendingVotes(
    () => storage,
    () => time,
  );
  return {
    storage,
    pending,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe("pending votes", () => {
  it("hands back the vote and its answer once", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", true);
    expect(pending.take("entry1")).toMatchObject({
      entryId: "entry1",
      sawInPerson: true,
    });
    expect(pending.take("entry1")).toBe(null);
  });

  it("peeks without forgetting", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", true);
    expect(pending.peek("entry1")?.sawInPerson).toBe(true);
    expect(pending.peek("entry2")).toBe(null);
    expect(pending.take("entry1")?.sawInPerson).toBe(true);
  });

  it("remembers which category they tapped", () => {
    const { pending } = setup();
    pending.save("entry1", "most_jolly", true);
    expect(pending.take("entry1")).toMatchObject({
      category: "most_jolly",
      sawInPerson: true,
    });
  });

  it("keeps an unasked answer as null", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", null);
    expect(pending.take("entry1")?.sawInPerson).toBe(null);
  });

  it("leaves a vote for another display alone", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", false);
    expect(pending.take("entry2")).toBe(null);
    expect(pending.take("entry1")?.sawInPerson).toBe(false);
  });

  it("drops a vote that has gone stale", () => {
    const { pending, storage, advance } = setup();
    pending.save("entry1", "best_display", true);
    advance(31 * 60_000);
    expect(pending.take("entry2")).toBe(null);
    expect(storage.items.size).toBe(0);
  });

  it("replaces the earlier vote when saved again", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", true);
    pending.save("entry2", "best_display", false);
    expect(pending.take("entry1")).toBe(null);
    expect(pending.take("entry2")?.sawInPerson).toBe(false);
  });

  it("forgets the vote when cleared", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", true);
    pending.clear();
    expect(pending.take("entry1")).toBe(null);
  });

  it("keeps the vote while they're away at Google", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", true);
    expect(pending.peek("entry1")?.isAtGoogle).toBe(false);
    pending.setAtGoogle(true);
    pending.abandon();
    expect(pending.peek("entry1")).toMatchObject({
      sawInPerson: true,
      isAtGoogle: true,
    });
    pending.setAtGoogle(false);
    expect(pending.peek("entry1")?.isAtGoogle).toBe(false);
  });

  it("forgets the vote when they walk away from the sheet", () => {
    const { pending } = setup();
    pending.save("entry1", "best_display", true);
    pending.abandon();
    expect(pending.peek("entry1")).toBe(null);
  });

  it("doesn't make up a vote when marking Google", () => {
    const { pending, storage } = setup();
    pending.setAtGoogle(true);
    expect(storage.items.size).toBe(0);
  });

  it("reads a vote saved before categories as a best display vote not at Google", () => {
    const { pending, storage } = setup();
    storage.setItem(
      "pg-pending-vote-v1",
      JSON.stringify({ entryId: "entry1", sawInPerson: true, savedAt: 1e6 }),
    );
    expect(pending.peek("entry1")).toMatchObject({
      category: "best_display",
      isAtGoogle: false,
    });
  });

  it("ignores junk in storage", () => {
    const { pending, storage } = setup();
    storage.setItem("pg-pending-vote-v1", "{not json");
    expect(pending.take("entry1")).toBe(null);
    storage.setItem(
      "pg-pending-vote-v1",
      JSON.stringify({ entryId: "entry1", sawInPerson: "yes", savedAt: 1 }),
    );
    expect(pending.take("entry1")).toBe(null);
    storage.setItem(
      "pg-pending-vote-v1",
      JSON.stringify({
        entryId: "entry1",
        category: "loudest",
        sawInPerson: true,
        savedAt: 1e6,
      }),
    );
    expect(pending.take("entry1")).toBe(null);
  });

  it("does nothing without storage", () => {
    const pending = createPendingVotes(() => null);
    pending.save("entry1", "best_display", true);
    expect(pending.take("entry1")).toBe(null);
  });

  it("never sends a vote it couldn't forget", () => {
    const storage = {
      ...memoryStorage(),
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const pending = createPendingVotes(() => storage);
    pending.save("entry1", "best_display", true);
    expect(pending.take("entry1")).toBe(null);
  });
});

describe("pendingVoteAction", () => {
  const voteFor = (entryId: string, category: VoteCategory) =>
    ({ _id: `vote-${entryId}`, category, entry: { _id: entryId } }) as MyVote;
  const noVotes: MyVotes = { best_display: null, most_jolly: null };
  const choose = (
    inPersonAllowed: boolean | null,
    votes: Partial<MyVotes> = {},
  ): VoteFlowStep => ({
    step: "choose",
    votes: { ...noVotes, ...votes },
    inPersonAllowed,
    canRetryLocation: false,
  });
  const voted = (votes: Partial<MyVotes>): VoteFlowStep => ({
    step: "voted",
    votes: { ...noVotes, ...votes },
    inPersonAllowed: true,
    canRetryLocation: false,
  });

  const signedOut: VoteFlowStep = {
    step: "signedOut",
    inPersonAllowed: true,
    canRetryLocation: false,
  };
  const pending = (
    sawInPerson: boolean | null,
    isAtGoogle: boolean,
    category: VoteCategory = "best_display",
  ) => ({ entryId: "entry1", category, sawInPerson, isAtGoogle });
  const fromGoogle = (sawInPerson: boolean | null, category?: VoteCategory) =>
    pending(sawInPerson, true, category);
  const inSheet = (sawInPerson: boolean | null) => pending(sawInPerson, false);

  it("waits for the page and the location check", () => {
    expect(
      pendingVoteAction({ step: "loading" }, fromGoogle(true), false),
    ).toBe("wait");
    expect(pendingVoteAction(choose(null), fromGoogle(true), false)).toBe(
      "wait",
    );
  });

  it("sends with their answer once it's settled", () => {
    expect(pendingVoteAction(choose(true), fromGoogle(true), false)).toBe(
      "send",
    );
    expect(pendingVoteAction(choose(true), fromGoogle(false), false)).toBe(
      "send",
    );
    expect(pendingVoteAction(choose(false), fromGoogle(null), false)).toBe(
      "send",
    );
  });

  it("sends after signing in from the sheet on this page", () => {
    expect(pendingVoteAction(choose(true), inSheet(true), true)).toBe("send");
  });

  it("never sends one left over from a sign-in they walked away from", () => {
    const elsewhere = { best_display: voteFor("entry2", "best_display") };
    expect(pendingVoteAction(choose(true), inSheet(true), false)).toBe("drop");
    expect(
      pendingVoteAction(choose(true, elsewhere), inSheet(true), false),
    ).toBe("drop");
  });

  it("reopens the sheet when they come back still signed out", () => {
    expect(pendingVoteAction(signedOut, fromGoogle(true), false)).toBe(
      "reopen",
    );
    expect(pendingVoteAction(signedOut, inSheet(true), false)).toBe("reopen");
    expect(pendingVoteAction(signedOut, inSheet(true), true)).toBe("wait");
  });

  it("asks before moving that category's vote from another display", () => {
    const elsewhere = { most_jolly: voteFor("entry2", "most_jolly") };
    expect(
      pendingVoteAction(
        choose(true, elsewhere),
        fromGoogle(true, "most_jolly"),
        false,
      ),
    ).toBe("confirmSwitch");
    // Their Most Jolly vote elsewhere doesn't stop a best display vote here
    expect(
      pendingVoteAction(choose(true, elsewhere), fromGoogle(true), false),
    ).toBe("send");
  });

  it("asks for an answer the location check now needs", () => {
    expect(pendingVoteAction(choose(true), fromGoogle(null), false)).toBe(
      "ask",
    );
  });

  it("sends the other category when they've already voted one here", () => {
    const here = { best_display: voteFor("entry1", "best_display") };
    expect(
      pendingVoteAction(voted(here), fromGoogle(true, "most_jolly"), false),
    ).toBe("send");
    expect(pendingVoteAction(voted(here), fromGoogle(true), false)).toBe(
      "drop",
    );
  });

  it("drops Most Jolly when the location check rules out seeing it", () => {
    expect(
      pendingVoteAction(choose(false), fromGoogle(true, "most_jolly"), false),
    ).toBe("drop");
  });

  it("drops it when there's nothing to vote on", () => {
    expect(
      pendingVoteAction({ step: "ownEntry" }, fromGoogle(true), false),
    ).toBe("drop");
    expect(
      pendingVoteAction(
        { step: "closed", year: 2026 },
        fromGoogle(true),
        false,
      ),
    ).toBe("drop");
  });
});
