// A vote tapped while signed out. Google sign-in leaves the site and comes
// back, so it's kept in sessionStorage and sent once they're in. It only
// lives while the sign-in sheet is open or they're away at Google, so a vote
// they walked away from never sends itself later.
import {
  VOTE_CATEGORIES,
  type VoteCategory,
} from "../../convex/features/votes/schema";
import type { VoteFlowStep } from "./useVoteFlow";

const KEY = "pg-pending-vote-v1";
// Long enough to sign in, short enough that an old tap never votes later
const MAX_AGE_MS = 30 * 60_000;

export type PendingVote = {
  entryId: string;
  // The button they tapped
  category: VoteCategory;
  // Their "seen it in person?" answer, null when it wasn't asked
  sawInPerson: boolean | null;
  savedAt: number;
  // They tapped Google and left the site to sign in
  isAtGoogle: boolean;
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

const browserStorage = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const isVoteCategory = (value: unknown): value is VoteCategory =>
  VOTE_CATEGORIES.some((category) => category === value);

const read = (storage: Storage): PendingVote | null => {
  try {
    const saved: unknown = JSON.parse(storage.getItem(KEY) ?? "null");
    if (typeof saved !== "object" || saved === null) return null;
    const { entryId, category, sawInPerson, savedAt, isAtGoogle } =
      saved as Record<string, unknown>;
    if (typeof entryId !== "string" || typeof savedAt !== "number") return null;
    if (sawInPerson !== null && typeof sawInPerson !== "boolean") return null;
    // Saved before Most Jolly was voted on here, when every vote was this
    const savedCategory = category ?? "best_display";
    if (!isVoteCategory(savedCategory)) return null;
    return {
      entryId,
      category: savedCategory,
      sawInPerson,
      savedAt,
      isAtGoogle: isAtGoogle === true,
    };
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

  const write = (pending: PendingVote) => {
    try {
      getStorage()?.setItem(KEY, JSON.stringify(pending));
    } catch {
      /* Storage unavailable: email sign-in still works on this page. */
    }
  };

  const clear = () => {
    try {
      getStorage()?.removeItem(KEY);
    } catch {
      /* Nothing to clear. */
    }
  };

  return {
    save(entryId: string, category: VoteCategory, sawInPerson: boolean | null) {
      write({
        entryId,
        category,
        sawInPerson,
        savedAt: now(),
        isAtGoogle: false,
      });
    },
    // Set as they leave for Google, and unset once they're back on the site
    setAtGoogle(isAtGoogle: boolean) {
      const storage = getStorage();
      const pending = storage && read(storage);
      if (pending) write({ ...pending, isAtGoogle });
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
    clear,
    // They left the page with the sheet still open. Going to Google keeps it.
    abandon() {
      const storage = getStorage();
      if (storage && read(storage)?.isAtGoogle !== true) clear();
    },
  };
}

export const pendingVotes = createPendingVotes();

// What to do with a pending vote. isSheetOpen is whether this page has the
// sign-in sheet open for it.
export function pendingVoteAction(
  state: VoteFlowStep,
  pending: Pick<
    PendingVote,
    "entryId" | "category" | "sawInPerson" | "isAtGoogle"
  >,
  isSheetOpen: boolean,
): "wait" | "reopen" | "drop" | "ask" | "send" | "confirmSwitch" {
  if (state.step === "loading") return "wait";
  // Back without signing in, e.g. they cancelled at Google
  if (state.step === "signedOut") return isSheetOpen ? "wait" : "reopen";
  // Only a sign-in they started for it sends it, not one later on
  if (!isSheetOpen && !pending.isAtGoogle) return "drop";
  // Their own entry, or voting closed meanwhile
  if (state.step !== "choose" && state.step !== "voted") return "drop";
  const existing = state.votes[pending.category];
  // Already voted for it in this category
  if (existing?.entry._id === pending.entryId) return "drop";
  if (state.inPersonAllowed === null) return "wait";
  // Most Jolly needs them to have seen it, which the location check now rules out
  if (
    pending.category === "most_jolly" &&
    !(state.inPersonAllowed && pending.sawInPerson)
  )
    return "drop";
  // The location check passed after all, so they still have to answer
  if (state.inPersonAllowed && pending.sawInPerson === null) return "ask";
  return existing ? "confirmSwitch" : "send";
}
