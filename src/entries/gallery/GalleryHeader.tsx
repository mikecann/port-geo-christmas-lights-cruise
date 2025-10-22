import { Stack, Group, Title, Text } from "@mantine/core";

export default function GalleryHeader() {
  return (
    <Stack gap="md" align="center">
      <Group gap="sm">
        <Title order={1} ta="center">
          Christmas Lights Competition Entries
        </Title>
      </Group>
      <Text size="lg" c="dimmed" ta="center" maw={600}>
        Discover the amazing Christmas light displays participating in the Port
        Geographe Christmas Cruise 2025 competition.
      </Text>
    </Stack>
  );
}
