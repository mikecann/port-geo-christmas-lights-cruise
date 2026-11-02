// Fetching the worker's signed IP location, kept apart from React so the
// retry rules can be tested

// Comfortably inside the server's 10 minute limit
const MAX_AGE_MS = 8 * 60_000;
const TIMEOUT_MS = 8_000;

export type FetchGeoToken = () => Promise<string | null>;

export const fetchGeoToken: FetchGeoToken = async () => {
  try {
    const response = await fetch("/api/geo", {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Plain `vite` without the worker serves the app's HTML here
    if (!response.ok) return null;
    const body = (await response.json()) as { token?: unknown };
    return typeof body.token === "string" ? body.token : null;
  } catch {
    return null;
  }
};

// Phones on the boat drop out, so a failed fetch tries again a few times.
// null only once every try has failed, undefined if it was stopped first.
export async function fetchGeoTokenWithRetries(
  fetchOnce: FetchGeoToken,
  options: {
    retries: number;
    wait: () => Promise<void>;
    isStopped: () => boolean;
  },
): Promise<string | null | undefined> {
  for (let attempt = 0; ; attempt++) {
    const token = await fetchOnce();
    if (options.isStopped()) return undefined;
    if (token !== null) return token;
    if (attempt >= options.retries) return null;
    await options.wait();
    if (options.isStopped()) return undefined;
  }
}

// A token only works for one vote, so each vote fetches its own. If that
// fetch fails, the page's spare one is used, once, while it's still fresh.
// Without a spare it tries again a couple of times, as a vote that can't get
// a token can't count as in person, and a phone on the boat often only
// dropped out for a moment.
export function createVoteTokens(
  fetchOnce: FetchGeoToken,
  now: () => number = Date.now,
  options: { retries: number; wait: () => Promise<void> } = {
    retries: 2,
    wait: () => new Promise((resolve) => setTimeout(resolve, 1_000)),
  },
) {
  let spare: { token: string; fetchedAt: number } | null = null;
  const takeSpare = () => {
    const fallback = spare;
    spare = null;
    return fallback && now() - fallback.fetchedAt < MAX_AGE_MS
      ? fallback.token
      : null;
  };
  return {
    keepSpare(token: string) {
      spare = { token, fetchedAt: now() };
    },
    async forVote() {
      const token = await fetchOnce();
      if (token !== null) return token;
      const fallback = takeSpare();
      if (fallback !== null) return fallback;
      for (let retry = 0; retry < options.retries; retry++) {
        await options.wait();
        const retried = await fetchOnce();
        if (retried !== null) return retried;
      }
      return null;
    },
    // For a vote that doesn't need to be in person: the location is still
    // sent when there's one to hand, so admins can see where People's Choice
    // votes came from, but it's tried once and never held up for retries
    async ifQuick() {
      const token = await fetchOnce();
      return token ?? takeSpare();
    },
  };
}
