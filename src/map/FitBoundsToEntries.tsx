import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";

interface FitBoundsToEntriesProps {
  entries: EntryWithFirstPhoto[];
  // Opened on one entry (/map/<id>): CenterOnEntry zooms to it instead, and
  // fitting everything later would throw that away
  skip: boolean;
}

// Shows every entry when the map first opens, once
export const FitBoundsToEntries = ({
  entries,
  skip,
}: FitBoundsToEntriesProps) => {
  const map = useMap();
  const hasInitted = useRef(false);

  useEffect(() => {
    if (!map) return;
    if (hasInitted.current) return;

    hasInitted.current = true;

    if (skip) return;
    if (entries.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    entries.forEach((entry) => {
      const address = entry.entry.houseAddress;
      bounds.extend({ lat: address.lat, lng: address.lng });
    });

    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }, [entries, map, skip]);

  return null;
};
