import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";

interface CenterOnEntryProps {
  entry: EntryWithFirstPhoto | null;
}

export const CenterOnEntry = ({ entry }: CenterOnEntryProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !entry) return;

    const address = entry.entry.houseAddress;

    // Center the map on the entry with a good zoom level
    map.setCenter({ lat: address.lat, lng: address.lng });
    map.setZoom(17); // Close zoom level to focus on the specific house
  }, [entry, map]);

  return null;
};
