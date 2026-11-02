import { useConvex, useConvexAuth } from "convex/react";
import { useState } from "react";
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
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  // Public entries don't say who entered, so it asks whether this one is
  // ours, but only once they tap Share: most visits never share
  const [isEntrant, setIsEntrant] = useState(false);
  const checkIsEntrant = () =>
    isAuthenticated
      ? convex
          .query(api.my.entries.find, {})
          .then((mine) => mine?._id === entryId)
          .catch(() => false)
      : Promise.resolve(false);
  const properties: ShareProperties = {
    entry_id: entryId,
    competition_id: entry.competitionId,
    is_entrant: isEntrant,
  };
  const shareTitle = `Check out ${entry.name}, number ${entry.entryNumber}`;
  const shareText = `${shareTitle} in the Port Geographe Christmas Lights competition!`;

  const share = async () => {
    const isEntrantCheck = checkIsEntrant();
    void isEntrantCheck.then(setIsEntrant);
    if (!canNativeShare()) return setOpened(true);
    // Phones only open the sheet straight from a tap, so it's opened before
    // waiting on the check. Its result is caught here so a quick cancel
    // isn't reported as an unhandled rejection meanwhile.
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
    const tracked = {
      ...properties,
      is_entrant: await isEntrantCheck,
      source: "native" as const,
    };
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
