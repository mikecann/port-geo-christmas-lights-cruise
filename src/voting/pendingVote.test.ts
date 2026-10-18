import { describe, expect, it } from "vitest";
import { createPendingVotes, pendingVoteAction } from "./pendingVote";
import type { MyVote, VoteFlowStep } from "./useVoteFlow";

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
    pending.save("entry1", true);
    expect(pending.take("entry1")).toMatchObject({
      entryId: "entry1",
      sawInPerson: true,
    });
    expect(pending.take("entry1")).toBe(null);
  });

  it("peeks without forgetting", () => {
    const { pending } = setup();
    pending.save("entry1", true);
    expect(pending.peek("entry1")?.sawInPerson).toBe(true);
    expect(pending.peek("entry2")).toBe(null);
    expect(pending.take("entry1")?.sawInPerson).toBe(true);
  });

  it("keeps an unasked answer as null", () => {
    const { pending } = setup();
    pending.save("entry1", null);
    expect(pending.take("entry1")?.sawInPerson).toBe(null);
  });

  it("leaves a vote for another display alone", () => {
    const { pending } = setup();
    pending.save("entry1", false);
    expect(pending.take("entry2")).toBe(null);
    expect(pending.take("entry1")?.sawInPerson).toBe(false);
  });

  it("drops a vote that has gone stale", () => {
    const { pending, storage, advance } = setup();
    pending.save("entry1", true);
    advance(31 * 60_000);
    expect(pending.take("entry2")).toBe(null);
    expect(storage.items.size).toBe(0);
  });

  it("replaces the earlier vote when saved again", () => {
    const { pending } = setup();
    pending.save("entry1", true);
    pending.save("entry2", false);
    expect(pending.take("entry1")).toBe(null);
    expect(pending.take("entry2")?.sawInPerson).toBe(false);
  });

  it("forgets the vote when cleared", () => {
    const { pending } = setup();
    pending.save("entry1", true);
    pending.clear();
    expect(pending.take("entry1")).toBe(null);
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
  });

  it("does nothing without storage", () => {
    const pending = createPendingVotes(() => null);
    pending.save("entry1", true);
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
    pending.save("entry1", true);
    expect(pending.take("entry1")).toBe(null);
  });
});

describe("pendingVoteAction", () => {
  const otherVote = { _id: "vote1" } as unknown as MyVote;
  const choose = (
    inPersonAllowed: boolean | null,
    other: MyVote | null = null,
  ): VoteFlowStep => ({
    step: "choose",
    otherVote: other,
    currentVote: null,
    inPersonAllowed,
    canRetryLocation: false,
  });

  it("waits for the page and the location check", () => {
    expect(pendingVoteAction({ step: "loading" }, true)).toBe("wait");
    expect(pendingVoteAction(choose(null), true)).toBe("wait");
  });

  it("sends with their answer once it's settled", () => {
    expect(pendingVoteAction(choose(true), true)).toBe("send");
    expect(pendingVoteAction(choose(true), false)).toBe("send");
    expect(pendingVoteAction(choose(false), null)).toBe("send");
  });

  it("asks before moving a vote from another display", () => {
    expect(pendingVoteAction(choose(true, otherVote), true)).toBe(
      "confirmSwitch",
    );
  });

  it("asks for an answer the location check now needs", () => {
    expect(pendingVoteAction(choose(true), null)).toBe("ask");
  });

  it("drops it when there's nothing to vote on", () => {
    expect(pendingVoteAction({ step: "ownEntry" }, true)).toBe("drop");
    expect(pendingVoteAction({ step: "closed", year: 2026 }, true)).toBe(
      "drop",
    );
    expect(pendingVoteAction({ step: "voted", vote: otherVote }, true)).toBe(
      "drop",
    );
  });
});
