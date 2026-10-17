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

    if (entries.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    entries.forEach((entry) => {
      const address = entry.entry.houseAddress;
      bounds.extend({ lat: address.lat, lng: address.lng });
    });

    map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
  }, [entries, map, hasInitted]);

  return null;
};
