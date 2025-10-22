import { Card, Stack, Text, Group, Badge, Alert, Loader } from "@mantine/core";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";

interface SubmittingEntryStateProps {
  entry: Doc<"entries">;
}

export default function SubmittingEntryState({
  entry,
}: SubmittingEntryStateProps) {
  const photos = useQuery(api.my.photos.list) ?? [];

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Text fw={500} size="lg">
              Your Competition Entry
            </Text>
            <Text size="sm" c="dimmed">
              Created {new Date(entry._creationTime).toLocaleDateString()}
            </Text>
          </Stack>
          <Badge color="blue" variant="light">
            <Group gap="xs">
              <Loader size="xs" />
              Submitting
            </Group>
          </Badge>
        </Group>

        {/* Entry details */}
        <div>
          <Text size="sm" fw={500} mb={4}>
            House Address:
          </Text>
          <Text size="sm" c="dimmed">
            {typeof entry.houseAddress === "string"
              ? entry.houseAddress
              : entry.houseAddress?.address || "Address not available"}
          </Text>
        </div>

        {entry.name && (
          <div>
            <Text size="sm" fw={500} mb={4}>
              Entry Name:
            </Text>
            <Text size="sm" c="dimmed">
              {entry.name}
            </Text>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb="sm">
              Photos
            </Text>
            <PhotoGallery photos={photos} showEmptyState={false} />
          </div>
        )}

        {/* Status information */}
        <Alert color="blue" variant="light">
          Your entry is being processed for submission. Please wait...
        </Alert>
      </Stack>
    </Card>
  );
}
