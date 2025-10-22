import { Card, Stack, Text, Group, Badge, Alert } from "@mantine/core";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";
import { getAddressString } from "../../../shared/misc";

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
            <Text fw={500} size="lg">
              Your Competition Entry
            </Text>
            <Text size="sm" c="dimmed">
              Created {new Date(entry._creationTime).toLocaleDateString()}
              {"submittedAt" in entry && (
                <span>
                  {" "}
                  • Submitted {new Date(entry.submittedAt).toLocaleDateString()}
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
            {getAddressString(entry.houseAddress)}
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
        <Alert color="yellow" variant="light">
          Your entry has been submitted and is being reviewed.
        </Alert>
      </Stack>
    </Card>
  );
}
