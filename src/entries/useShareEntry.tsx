import { useConvexAuth, useQuery } from "convex/react";
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
  const { isAuthenticated } = useConvexAuth();
  // Public entries don't say who entered, so ask whether this one is ours
  const myEntry = useQuery(api.my.entries.find, isAuthenticated ? {} : "skip");
  const properties: ShareProperties = {
    entry_id: entryId,
    competition_id: entry.competitionId,
    is_entrant: myEntry?._id === entryId,
  };
  const shareTitle = `Check out ${entry.name}, number ${entry.entryNumber}`;
  const shareText = `${shareTitle} in the Port Geographe Christmas Lights competition!`;

  const share = async () => {
    if (!canNativeShare()) return setOpened(true);
    track("share_intent", { ...properties, source: "native" });
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareLink(window.location.origin, entryId, "native"),
      });
      track("native_share_resolved", { ...properties, source: "native" });
    } catch (error) {
      // Closing the sheet is an AbortError and needs nothing. Anything else
      // (some in-app browsers refuse) falls back to the list.
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setOpened(true);
    }
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
