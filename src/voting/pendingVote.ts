// A vote tapped while signed out. Google sign-in leaves the site and comes
// back, so it's kept in sessionStorage and sent once they're in.
import type { VoteFlowStep } from "./useVoteFlow";

const KEY = "pg-pending-vote-v1";
// Long enough to sign in, short enough that an old tap never votes later
const MAX_AGE_MS = 30 * 60_000;

export type PendingVote = {
  entryId: string;
  // Their "seen it in person?" answer, null when it wasn't asked
  sawInPerson: boolean | null;
  savedAt: number;
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

const browserStorage = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const read = (storage: Storage): PendingVote | null => {
  try {
    const saved: unknown = JSON.parse(storage.getItem(KEY) ?? "null");
    if (typeof saved !== "object" || saved === null) return null;
    const { entryId, sawInPerson, savedAt } = saved as Record<string, unknown>;
    if (typeof entryId !== "string" || typeof savedAt !== "number") return null;
    if (sawInPerson !== null && typeof sawInPerson !== "boolean") return null;
    return { entryId, sawInPerson, savedAt };
  } catch {
    return null;
  }
};

export function createPendingVotes(
  getStorage: () => Storage | null = browserStorage,
  now: () => number = Date.now,
) {
  const peek = (storage: Storage, entryId: string) => {
    const pending = read(storage);
    if (!pending) return { pending: null, isStale: false };
    const isStale = now() - pending.savedAt > MAX_AGE_MS;
    return {
      pending: !isStale && pending.entryId === entryId ? pending : null,
      isStale,
    };
  };

  return {
    save(entryId: string, sawInPerson: boolean | null) {
      try {
        getStorage()?.setItem(
          KEY,
          JSON.stringify({ entryId, sawInPerson, savedAt: now() }),
        );
      } catch {
        /* Storage unavailable: email sign-in still works on this page. */
      }
    },
    peek(entryId: string): PendingVote | null {
      const storage = getStorage();
      return storage ? peek(storage, entryId).pending : null;
    },
    // Hands the vote over once and forgets it, so it can't be sent twice. One
    // for another display stays put until it goes stale.
    take(entryId: string): PendingVote | null {
      const storage = getStorage();
      if (!storage) return null;
      const { pending, isStale } = peek(storage, entryId);
      if (!pending && !isStale) return null;
      try {
        storage.removeItem(KEY);
      } catch {
        return null;
      }
      return pending;
    },
    clear() {
      try {
        getStorage()?.removeItem(KEY);
      } catch {
        /* Nothing to clear. */
      }
    },
  };
}

export const pendingVotes = createPendingVotes();

// What to do with a pending vote once they're signed in
export function pendingVoteAction(
  state: VoteFlowStep,
  sawInPerson: boolean | null,
): "wait" | "drop" | "ask" | "send" | "confirmSwitch" {
  if (state.step === "loading" || state.step === "signedOut") return "wait";
  // Already voted for it, their own entry, or voting closed meanwhile
  if (state.step !== "choose") return "drop";
  if (state.inPersonAllowed === null) return "wait";
  // The location check passed after all, so they still have to answer
  if (state.inPersonAllowed && sawInPerson === null) return "ask";
  return state.otherVote ? "confirmSwitch" : "send";
}
