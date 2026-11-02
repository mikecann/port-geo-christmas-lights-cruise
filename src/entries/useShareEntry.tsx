import {
  type RequestForQueries,
  useConvexAuth,
  useQueries,
} from "convex/react";
import { useMemo, useState } from "react";
import { track } from "../analytics/client";
import { shareLink } from "../analytics/privacy";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ShareModal, { type ShareProperties } from "./ShareModal";

type ShareEntry = {
  name: string;
  competitionId?: string;
  entryNumber: number;
};

// Phones have a share sheet with every app the person actually uses, so the
// Share button goes straight to it. Computers often have navigator.share too,
// but there the sheet is unfamiliar, so they get the short list instead.
const canNativeShare = () =>
  navigator.share !== undefined &&
  window.matchMedia("(pointer: coarse)").matches;

// The Share button's behaviour: `share` opens the phone's share sheet, or the
// fallback list in `modal` when there isn't one
export function useShareEntry(entry: ShareEntry, entryId: Id<"entries">) {
  const [opened, setOpened] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  // Public entries don't say who entered, so it asks whether this one is
  // ours. Only for signed-in visitors, and up front, so sharing never waits
  // on it and the analytics always have the answer. useQueries hands back an
  // error instead of throwing, so a stale session (e.g. a deleted user) can't
  // take down this public page over an analytics detail. The request is
  // memoised: a new object every render re-subscribes in a loop (React
  // error 301), which is what took the page down in #44.
  const queries = useMemo((): RequestForQueries => {
    if (!isAuthenticated) return {};
    return { mine: { query: api.my.entries.find, args: {} } };
  }, [isAuthenticated]);
  const mine: unknown = useQueries(queries).mine;
  const isEntrant =
    typeof mine === "object" &&
    mine !== null &&
    !(mine instanceof Error) &&
    (mine as { _id: string })._id === entryId;
  const properties: ShareProperties = {
    entry_id: entryId,
    competition_id: entry.competitionId,
    is_entrant: isEntrant,
  };
  const shareTitle = `Check out ${entry.name}, number ${entry.entryNumber}`;
  const shareText = `${shareTitle} in the Port Geographe Christmas Lights competition!`;

  const share = async () => {
    if (!canNativeShare()) return setOpened(true);
    // Its result is caught here so a quick cancel isn't reported as an
    // unhandled rejection
    const outcome = navigator
      .share({
        title: shareTitle,
        text: shareText,
        url: shareLink(window.location.origin, entryId, "native"),
      })
      .then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      );
    const tracked = { ...properties, source: "native" as const };
    track("share_intent", tracked);
    const result = await outcome;
    if (result.ok) track("native_share_resolved", tracked);
    // Closing the sheet is an AbortError and needs nothing. Anything else
    // (some in-app browsers refuse) falls back to the list.
    else if (!(
      result.error instanceof DOMException && result.error.name === "AbortError"
    ))
      setOpened(true);
  };

  const modal = (
    <ShareModal
      opened={opened}
      onClose={() => setOpened(false)}
      entryId={entryId}
      shareText={shareText}
      properties={properties}
    />
  );

  return { share, modal };
}
