import * as React from "react";
import { Text, Paper, Button, Switch, Stack } from "@mantine/core";
import { IconCrosshair } from "@tabler/icons-react";
import { useMap } from "@vis.gl/react-google-maps";
import { useUserLocationContext } from "../useUserLocationContext";

export const TrackingStatus: React.FC = () => {
  const map = useMap();
  const { status } = useUserLocationContext();
  const [followMe, setFollowMe] = React.useState(false);
  const position = status.kind === "tracking" ? status.position.coords : null;

  const hasInitiallyCentered = React.useRef(false);

  // Follow me mode - continuously center on user
  React.useEffect(() => {
    if (!map) return;
    if (!followMe) return;
    if (!position) return;

    map.setCenter({
      lat: position.latitude,
      lng: position.longitude,
    });
  }, [map, followMe, position]);

  // Center map on user when first getting location
  const centerLatitude =
    status.kind === "tracking" ? status.position.coords.latitude : null;
  const centerLongitude =
    status.kind === "tracking" ? status.position.coords.longitude : null;

  React.useEffect(() => {
    if (!map) return;
    if (hasInitiallyCentered.current) return;
    if (status.kind !== "tracking") return;

    hasInitiallyCentered.current = true;

    map.setCenter({
      lat: status.position.coords.latitude,
      lng: status.position.coords.longitude,
    });
    if ((map.getZoom?.() ?? 0) < 15) map.setZoom(16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, status.kind, centerLatitude, centerLongitude]);

  // Reset initial centering flag when tracking stops
  React.useEffect(() => {
    hasInitiallyCentered.current = false;
  }, [status.kind]);

  if (!map) return null;
  if (!position) return null;

  const { accuracy, latitude, longitude } = position;

  return (
    <Paper
      withBorder
      p="xs"
      radius="md"
      shadow="sm"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <Stack gap="xs">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconCrosshair size={16} />}
          onClick={() => {
            if (position) {
              map.setCenter({
                lat: position.latitude,
                lng: position.longitude,
              });
              if ((map.getZoom?.() ?? 0) < 15) map.setZoom(16);
            }
          }}
        >
          Center on me
        </Button>

        <Switch
          size="md"
          checked={followMe}
          onChange={(e) => setFollowMe(e.currentTarget.checked)}
          label={
            <Text size="sm" c="dimmed">
              Follow me
            </Text>
          }
        />
      </Stack>
    </Paper>
  );
};
