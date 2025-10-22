import { Card, Stack, Text } from "@mantine/core";

interface NoResultsMessageProps {
  searchQuery: string;
}

export default function NoResultsMessage({
  searchQuery,
}: NoResultsMessageProps) {
  return (
    <Card withBorder p="xl">
      <Stack gap="md" align="center">
        <Text size="lg" c="dimmed" ta="center">
          No entries found matching "{searchQuery}"
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          Try a different search term or browse all entries
        </Text>
      </Stack>
    </Card>
  );
}
