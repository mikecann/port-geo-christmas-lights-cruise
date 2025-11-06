import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { useIsSystemAdmin } from "../auth/useMeHooks";
import { COMPETITION_GEOGRAPHIC_BOUNDARY } from "../../shared/constants";

export function CompetitionBoundaryOverlay() {
  const map = useMap();
  const isSystemAdmin = useIsSystemAdmin();
  const rectangleRef = useRef<google.maps.Rectangle | null>(null);

  useEffect(() => {
    if (!map || !isSystemAdmin) {
      // Clean up rectangle if map is not available or user is not system admin
      if (rectangleRef.current) {
        rectangleRef.current.setMap(null);
        rectangleRef.current = null;
      }
      return;
    }

    // Create rectangle if it doesn't exist
    if (!rectangleRef.current) {
      rectangleRef.current = new google.maps.Rectangle({
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(
            COMPETITION_GEOGRAPHIC_BOUNDARY.southWest.lat,
            COMPETITION_GEOGRAPHIC_BOUNDARY.southWest.lng,
          ),
          new google.maps.LatLng(
            COMPETITION_GEOGRAPHIC_BOUNDARY.northEast.lat,
            COMPETITION_GEOGRAPHIC_BOUNDARY.northEast.lng,
          ),
        ),
        strokeColor: "#dc2626",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillOpacity: 0,
        clickable: false,
      });
    }

    // Set rectangle on map
    rectangleRef.current.setMap(map);

    // Cleanup function
    return () => {
      if (rectangleRef.current) {
        rectangleRef.current.setMap(null);
        rectangleRef.current = null;
      }
    };
  }, [map, isSystemAdmin]);

  return null;
}

