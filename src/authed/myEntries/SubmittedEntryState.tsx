import { Card, Stack, Text, Group, Badge, Alert } from "@mantine/core";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";
import EntryNumberBadge from "./EntryNumberBadge";

interface SubmittedEntryStateProps {
  entry: Doc<"entries">;
}

export default function SubmittedEntryState({
  entry,
}: SubmittedEntryStateProps) {
  const photos = useQuery(api.my.photos.list) ?? [];

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="sm" align="center">
              <Text fw={500} size="lg">
                Your Competition Entry
              </Text>
              <EntryNumberBadge entry={entry} />
            </Group>
            <Text size="sm" c="dimmed">
              Created {new Date(entry._creationTime).toLocaleDateString()}
              {"submittedAt" in entry.state && (
                <span>
                  {" "}
                  • Submitted{" "}
                  {new Date(entry.state.submittedAt).toLocaleDateString()}
                </span>
              )}
            </Text>
          </Stack>
          <Badge color="yellow" variant="light">
            Submitted
          </Badge>
        </Group>

        {/* Entry details */}
        <div>
          <Text size="sm" fw={500} mb={4}>
            House Address:
          </Text>
          <Text size="sm" c="dimmed">
            {entry.state.houseAddress?.address}
          </Text>
        </div>

        {entry.state.name && (
          <div>
            <Text size="sm" fw={500} mb={4}>
              Entry Name:
            </Text>
            <Text size="sm" c="dimmed">
              {entry.state.name}
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
        <Alert color="yellow" variant="light">
          Your entry has been submitted and is being reviewed.
        </Alert>
      </Stack>
    </Card>
  );
}
