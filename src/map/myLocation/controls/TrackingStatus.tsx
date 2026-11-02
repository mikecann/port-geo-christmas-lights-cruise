import * as React from "react";
import { IconCurrentLocation } from "@tabler/icons-react";
import { useMap } from "@vis.gl/react-google-maps";
import { useUserLocationContext } from "../useUserLocationContext";
import { LocateButton } from "./LocateButton";

// Works like the button in Google Maps: tap to centre on yourself and keep
// following as you move (on a boat, say); drag the map and it stops following
export const TrackingStatus: React.FC = () => {
  const map = useMap();
  const { status } = useUserLocationContext();
  const [followMe, setFollowMe] = React.useState(true);
  const position = status.kind === "tracking" ? status.position.coords : null;
  const latitude = position?.latitude;
  const longitude = position?.longitude;

  // The first fix zooms in to street level, after that only follows
  const hasZoomed = React.useRef(false);
  React.useEffect(() => {
    if (!map || !followMe) return;
    if (latitude === undefined || longitude === undefined) return;
    map.setCenter({ lat: latitude, lng: longitude });
    if (!hasZoomed.current && (map.getZoom() ?? 0) < 16) map.setZoom(16);
    hasZoomed.current = true;
  }, [map, followMe, latitude, longitude]);

  React.useEffect(() => {
    if (!map) return;
    const listener = map.addListener("dragstart", () => setFollowMe(false));
    return () => listener.remove();
  }, [map]);

  if (!map || !position) return null;

  return (
    <LocateButton
      label={followMe ? "Following you" : "Show where I am"}
      active={followMe}
      onClick={() => setFollowMe(true)}
    >
      <IconCurrentLocation size={22} />
    </LocateButton>
  );
};
