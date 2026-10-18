import { useCallback, useEffect, useRef, useState } from "react";
import {
  createVoteTokens,
  fetchGeoToken,
  fetchGeoTokenWithRetries,
} from "./geoTokens";

const RETRY_MS = 3_000;
const MAX_RETRIES = 3;

export type GeoTokenStatus = "checking" | "ready" | "failed";

// The worker's signed IP location for in-person votes. It stays "checking"
// until a fetch works or every retry has failed, so one dropout doesn't count
// as "not in person".
export function useGeoToken() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<GeoTokenStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const voteTokens = useRef(createVoteTokens(fetchGeoToken));

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void fetchGeoTokenWithRetries(fetchGeoToken, {
      retries: MAX_RETRIES,
      wait: () =>
        new Promise((resolve) => {
          timer = setTimeout(resolve, RETRY_MS);
        }),
      isStopped: () => stopped,
    }).then((next) => {
      if (next === undefined) return;
      if (next !== null) voteTokens.current.keepSpare(next);
      setToken(next);
      setStatus(next === null ? "failed" : "ready");
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("checking");
    setAttempt((count) => count + 1);
  }, []);
  const forVote = useCallback(() => voteTokens.current.forVote(), []);
  // A vote couldn't get a token either, so offer the retry again
  const markFailed = useCallback(() => {
    setToken(null);
    setStatus("failed");
  }, []);

  return { token, status, retry, forVote, markFailed };
}
