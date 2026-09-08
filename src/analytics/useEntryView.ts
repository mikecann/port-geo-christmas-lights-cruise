import { useEffect, useRef } from "react";
import { track } from "./client";
export function useEntryView(
  entryId: string | undefined,
  competitionId: string | undefined,
  surface: "entry" | "map",
) {
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!entryId || previous.current === entryId) return;
    previous.current = entryId;
    track("entry_viewed", {
      entry_id: entryId,
      competition_id: competitionId,
      surface,
    });
  }, [entryId, competitionId, surface]);
}
