import { useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { SIGN_IN_CODE_LIFETIME_MINUTES } from "../../shared/auth";

// Which address a code went to, kept for the tab. iPhones often reload the
// tab while someone is over in Mail fetching the code, which would otherwise
// put them back at the email step with a code they can't type in.
const SENT_KEY = "pg-email-code-sent-v1";

export type SentCode = { email: string; sentAt: number };

export const sentCodes = {
  read(): SentCode | null {
    try {
      const saved: unknown = JSON.parse(
        window.sessionStorage.getItem(SENT_KEY) ?? "null",
      );
      if (typeof saved !== "object" || saved === null) return null;
      const { email, sentAt } = saved as Record<string, unknown>;
      if (typeof email !== "string" || typeof sentAt !== "number") return null;
      // Only while the code still works
      if (Date.now() - sentAt > SIGN_IN_CODE_LIFETIME_MINUTES * 60_000)
        return null;
      return { email, sentAt };
    } catch {
      return null;
    }
  },
  save(email: string) {
    try {
      window.sessionStorage.setItem(
        SENT_KEY,
        JSON.stringify({ email, sentAt: Date.now() } satisfies SentCode),
      );
    } catch {
      /* Storage unavailable: it just won't survive a reload. */
    }
  },
  clear() {
    try {
      window.sessionStorage.removeItem(SENT_KEY);
    } catch {
      /* Nothing to clear. */
    }
  },
};

// Any sign-in (Google too) and any sign-out forgets the email step, so a
// shared phone or iPad never reopens on the last person's address. It can't
// clear while signed out otherwise: a reload mid-sign-in has to keep it.
export function useForgetSentCodeOnSignInOrOut() {
  const { isAuthenticated } = useConvexAuth();
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (isAuthenticated || wasSignedIn.current) sentCodes.clear();
    wasSignedIn.current = isAuthenticated;
  }, [isAuthenticated]);
}
