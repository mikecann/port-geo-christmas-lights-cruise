import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

// From this zoom in, the pins show photos; further out they're just numbers
export const PHOTO_ZOOM = 16;

// Reports the map's zoom as it changes. A listener
// on the map itself rather than the Map's onZoomChanged prop, which misses the
// zoom CenterOnEntry sets before the prop's listener is attached.
export function WatchZoom({ onChange }: { onChange: (zoom: number) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const update = () => onChange(map.getZoom() ?? 0);
    update();
    const listener = map.addListener("zoom_changed", update);
    return () => listener.remove();
  }, [map, onChange]);

  return null;
}
