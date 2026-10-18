import { describe, expect, it, vi } from "vitest";
import { createVoteTokens, fetchGeoTokenWithRetries } from "./geoTokens";

// Hands back each answer in turn, like a connection that drops out
const answers = (...tokens: Array<string | null>) => {
  const fetchOnce = vi.fn(async () => tokens.shift() ?? null);
  return fetchOnce;
};

describe("fetchGeoTokenWithRetries", () => {
  const options = {
    retries: 3,
    wait: async () => {},
    isStopped: () => false,
  };

  it("keeps trying after a dropout instead of giving up", async () => {
    const fetchOnce = answers(null, null, "token");

    expect(await fetchGeoTokenWithRetries(fetchOnce, options)).toBe("token");
    expect(fetchOnce).toHaveBeenCalledTimes(3);
  });

  it("only says it failed once every retry has", async () => {
    const fetchOnce = answers();

    expect(await fetchGeoTokenWithRetries(fetchOnce, options)).toBeNull();
    expect(fetchOnce).toHaveBeenCalledTimes(4);
  });

  it("stops quietly when the page has moved on", async () => {
    let stopped = false;
    const fetchOnce = answers(null, "token");

    const result = fetchGeoTokenWithRetries(fetchOnce, {
      ...options,
      wait: async () => {
        stopped = true;
      },
      isStopped: () => stopped,
    });

    expect(await result).toBeUndefined();
    expect(fetchOnce).toHaveBeenCalledTimes(1);
  });
});

describe("createVoteTokens", () => {
  it("fetches a new token for every vote", async () => {
    const tokens = createVoteTokens(answers("first", "second"));
    tokens.keepSpare("spare");

    expect(await tokens.forVote()).toBe("first");
    expect(await tokens.forVote()).toBe("second");
  });

  it("falls back to the spare once when the fetch fails", async () => {
    const tokens = createVoteTokens(answers());
    tokens.keepSpare("spare");

    expect(await tokens.forVote()).toBe("spare");
    expect(await tokens.forVote()).toBeNull();
  });

  it("won't use a spare that's too old to be accepted", async () => {
    let now = 0;
    const tokens = createVoteTokens(answers(), () => now);
    tokens.keepSpare("spare");
    now = 9 * 60_000;

    expect(await tokens.forVote()).toBeNull();
  });
});
