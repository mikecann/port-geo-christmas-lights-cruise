import { useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { CenterOnEntry } from "./CenterOnEntry";
import { MapDebugInfo } from "./MapDebugInfo";
import { CompetitionBoundaryOverlay } from "./CompetitionBoundaryOverlay";
import { EntryPins } from "./EntryPins";
import MyLocationControls from "./myLocation/controls/MyLocationControls";
import { UserLocationProvider } from "./myLocation/UserLocationProvider";
import type { Id } from "../../convex/_generated/dataModel";
import MyLocationMarker from "./myLocation/marker/MyLocationMarker";
import { routes } from "../routes";
import { FitBoundsToEntries } from "./FitBoundsToEntries";

export default function MapPage({
  selectedEntryId,
}: {
  selectedEntryId?: Id<"entries">;
}) {
  const entries = useQuery(api.public.entries.listWithFirstPhoto, {});

  // Find the specific entry if we have a route entry ID
  const targetEntry = entries?.find(
    (entry) => entry.entry._id === selectedEntryId,
  );

  // Replace rather than push, so the phone's Back button leaves the map
  // instead of stepping back through every popup that was opened. Both read
  // the address bar rather than props so they stay stable for the memoised
  // markers.
  const selectEntry = useCallback((entryId: string) => {
    const target = routes.mapEntry({ entryId });
    if (window.location.pathname !== target.href) target.replace();
  }, []);
  const deselect = useCallback(() => {
    const target = routes.map();
    if (window.location.pathname !== target.href) target.replace();
  }, []);

  // Prevent scrollbars when map is full-screen
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!entries) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "60px",
        left: "0",
        right: "0",
        bottom: "0",
      }}
    >
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <UserLocationProvider>
          <Map
            defaultCenter={{ lat: -33.6, lng: 115.4 }}
            defaultZoom={12}
            style={{ height: "100%", width: "100%" }}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeId="hybrid"
            mapTypeControl={false}
            mapId="DEMO_MAP_ID"
            onClick={deselect}
            clickableIcons={false}
            streetViewControl={false}
            cameraControl={false}
          >
            {/* Skip only when the entry was found: a stale or unpublished link
                should still open on every entry */}
            <FitBoundsToEntries entries={entries} skip={!!targetEntry} />
            {targetEntry ? <CenterOnEntry entry={targetEntry} /> : null}
            <MapDebugInfo />
            <CompetitionBoundaryOverlay />
            <EntryPins
              entries={entries}
              selectedEntryId={selectedEntryId}
              onSelect={selectEntry}
              onDeselect={deselect}
            />
            <MyLocationMarker />
            <MyLocationControls />
          </Map>
        </UserLocationProvider>
      </APIProvider>
    </div>
  );
}
