import { Badge, Card, Divider, Group, Stack, Text, Title } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";

export type PreviousEntry = NonNullable<
  FunctionReturnType<typeof api.my.entries.findPrevious>
>;

// Read-only: it's a record of what they entered last time
export default function PreviousEntrySection({
  previous,
}: {
  previous: PreviousEntry | null | undefined;
}) {
  if (!previous) return null;
  const { year, entry, photos } = previous;

  return (
    <Stack gap="md" mt="xl">
      <Divider />
      <Title order={2} size="h3">
        Your {year} entry
      </Title>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Text fw={600} size="lg">
              {entry.name}
            </Text>
            <Badge color="gray" variant="filled" size="sm">
              Entry #{entry.entryNumber}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            {entry.address}
          </Text>
          <PhotoGallery photos={photos} showEmptyState={false} />
          <Text size="xs" c="dimmed">
            Kept as a record of {year}, so it can't be changed.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
