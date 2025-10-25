import { Stack, Text } from "@mantine/core";

export default function FooterEventInfo() {
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
          December 2025
        </Text>
        <Text c="gray.4" size="sm">
          Busselton, Western Australia
        </Text>
      </Stack>
    </Stack>
  );
}
