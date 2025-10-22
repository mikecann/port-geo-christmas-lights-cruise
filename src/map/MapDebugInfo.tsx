import React, { useState } from "react";
import { Card, Text, Group, Code } from "@mantine/core";
import { useMap } from "@vis.gl/react-google-maps";
import { useIsSystemAdmin } from "../auth/useMeHooks";

interface Coordinates {
  lat: number;
  lng: number;
}

function MousePositionTracker() {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;

    const mouseMoveListener = map.addListener(
      "mousemove",
      (e: google.maps.MapMouseEvent) => {
        if (e.latLng)
          setPosition({
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
          });
      },
    );

    const mouseOutListener = map.addListener("mouseout", () => {
      setPosition(null);
    });

    return () => {
      google.maps.event.removeListener(mouseMoveListener);
      google.maps.event.removeListener(mouseOutListener);
    };
  }, [map]);

  if (!position) return null;

  return (
    <Card
      withBorder
      p="xs"
      style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        zIndex: 1000,
        minWidth: "200px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(4px)",
      }}
    >
      <Group gap="xs" align="center">
        <Text size="xs" fw={600} c="dimmed">
          DEBUG:
        </Text>
        <div>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Lat:
            </Text>
            <Code>{position.lat.toFixed(6)}</Code>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Lng:
            </Text>
            <Code>{position.lng.toFixed(6)}</Code>
          </Group>
        </div>
      </Group>
    </Card>
  );
}

export function MapDebugInfo() {
  const isSystemAdmin = useIsSystemAdmin();

  if (!isSystemAdmin) return null;

  return <MousePositionTracker />;
}
