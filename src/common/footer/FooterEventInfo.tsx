import { Stack, Text } from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function FooterEventInfo() {
  const competition = useQuery(api.public.competitions.current, {});
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Event Info
      </Text>
      <Stack gap="xs">
        <Text c="gray.4" size="sm">
          Port Geographe Christmas Lights Cruise
        </Text>
        <Text c="gray.4" size="sm">
          {competition
            ? `${competition.year} dates to be announced`
            : "Dates to be announced"}
        </Text>
        <Text c="gray.4" size="sm">
          Busselton, Western Australia
        </Text>
      </Stack>
    </Stack>
  );
}
