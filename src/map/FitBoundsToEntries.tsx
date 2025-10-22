import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";

interface FitBoundsToEntriesProps {
  entries: EntryWithFirstPhoto[];
}

export const FitBoundsToEntries = ({ entries }: FitBoundsToEntriesProps) => {
  const map = useMap();
  const hasInitted = useRef(false);

  useEffect(() => {
    if (!map) return;
    if (hasInitted.current) return;
    if (entries == undefined) return;

    hasInitted.current = true;

    const validEntries = entries.filter(
      (entry) =>
        entry.entry.status === "approved" &&
        entry.entry.houseAddress &&
        typeof entry.entry.houseAddress === "object",
    );

    if (validEntries.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    validEntries.forEach((entry) => {
      const address = entry.entry.houseAddress as { lat: number; lng: number };
      bounds.extend({ lat: address.lat, lng: address.lng });
    });

    map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
  }, [entries, map, hasInitted]);

  return null;
};
