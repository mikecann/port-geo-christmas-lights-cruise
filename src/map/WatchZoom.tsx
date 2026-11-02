import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

// From this zoom in, the pins show photos; further out they're just numbers
const PHOTO_ZOOM = 16;

// Reports whether the map is zoomed in far enough for photo pins. A listener
// on the map itself rather than the Map's onZoomChanged prop, which misses the
// zoom CenterOnEntry sets before the prop's listener is attached.
export function WatchZoom({
  onChange,
}: {
  onChange: (zoomedIn: boolean) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const update = () => onChange((map.getZoom() ?? 0) >= PHOTO_ZOOM);
    update();
    const listener = map.addListener("zoom_changed", update);
    return () => listener.remove();
  }, [map, onChange]);

  return null;
}
