import { useCallback, useEffect, useRef, useState } from "react";

// Comfortably inside the server's 15 minute limit
const MAX_AGE_MS = 10 * 60_000;
const TIMEOUT_MS = 8_000;
// Phones on the boat drop out, so a failed fetch tries again a few times
const RETRY_MS = 15_000;
const MAX_RETRIES = 3;

async function fetchGeoToken(): Promise<string | null> {
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
}

// The worker's signed IP location for in-person votes. token is undefined
// while the first fetch is out, and null when there isn't one.
export function useGeoToken() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const fetchedAt = useRef(0);

  const load = useCallback(async () => {
    const next = await fetchGeoToken();
    if (next) fetchedAt.current = Date.now();
    setToken(next);
    return next;
  }, []);

  useEffect(() => {
    let retries = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = async () => {
      const next = await load();
      if (next === null && !stopped && retries < MAX_RETRIES) {
        retries++;
        timer = setTimeout(attempt, RETRY_MS);
      }
    };
    void attempt();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [load]);

  // A phone can sleep with the page open, so check the age right before voting
  const fresh = useCallback(async () => {
    if (token && Date.now() - fetchedAt.current < MAX_AGE_MS) return token;
    return await load();
  }, [token, load]);

  return { token, fresh };
}
