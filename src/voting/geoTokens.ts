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
export function createVoteTokens(
  fetchOnce: FetchGeoToken,
  now: () => number = Date.now,
) {
  let spare: { token: string; fetchedAt: number } | null = null;
  return {
    keepSpare(token: string) {
      spare = { token, fetchedAt: now() };
    },
    async forVote() {
      const token = await fetchOnce();
      if (token !== null) return token;
      const fallback = spare;
      spare = null;
      if (fallback && now() - fallback.fetchedAt < MAX_AGE_MS)
        return fallback.token;
      return null;
    },
  };
}
