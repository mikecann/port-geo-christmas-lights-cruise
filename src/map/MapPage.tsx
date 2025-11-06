import React, { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { CenterOnEntry } from "./CenterOnEntry";
import { MapDebugInfo } from "./MapDebugInfo";
import { CompetitionBoundaryOverlay } from "./CompetitionBoundaryOverlay";
import { EntryMarker } from "./EntryMarker";
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
  const entries = useQuery(api.public.entries.listWithFirstPhoto);

  // Find the specific entry if we have a route entry ID
  const targetEntry = entries?.find(
    (entry) => entry.entry._id === selectedEntryId,
  );

  // State for managing marker interactions
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);

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
            onClick={() => routes.map().push()}
            clickableIcons={false}
            streetViewControl={false}
            cameraControl={false}
          >
            <FitBoundsToEntries entries={entries} />
            {targetEntry ? <CenterOnEntry entry={targetEntry} /> : null}
            <MapDebugInfo />
            <CompetitionBoundaryOverlay />
            {entries.map((entry) => (
              <EntryMarker
                key={entry.entry._id}
                entry={entry}
                isHovered={hoveredEntryId === entry.entry._id}
                isSelected={selectedEntryId === entry.entry._id}
                onHover={() => setHoveredEntryId(entry.entry._id)}
                onHoverEnd={() => setHoveredEntryId(null)}
                onClick={() =>
                  routes.mapEntry({ entryId: entry.entry._id }).push()
                }
              />
            ))}
            <MyLocationMarker />
            <MyLocationControls />
          </Map>
        </UserLocationProvider>
      </APIProvider>
    </div>
  );
}
