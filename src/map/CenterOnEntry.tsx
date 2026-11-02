import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";

interface CenterOnEntryProps {
  entry: EntryWithFirstPhoto | null;
}

// Zoomed in far enough to see the photo pins and the houses
const HOUSE_ZOOM = 17;

export const CenterOnEntry = ({ entry }: CenterOnEntryProps) => {
  const map = useMap();
  const lat = entry?.entry.houseAddress.lat;
  const lng = entry?.entry.houseAddress.lng;

  // Keyed on the position, not the entry object, so a live update to the
  // entries doesn't yank the map back while someone is panning around
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined) return;
    if ((map.getZoom() ?? 0) < HOUSE_ZOOM) map.setZoom(HOUSE_ZOOM);
    // Centred, the popup above the pin fits on a phone, and the info window's
    // own auto-pan nudges it the rest of the way if it doesn't
    map.setCenter({ lat, lng });
  }, [map, lat, lng]);

  return null;
};
