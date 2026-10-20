import { Card, Stack, Text, Group, Badge, Alert } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";

interface RejectedEntryStateProps {
  entry: Doc<"entries">;
}

export default function RejectedEntryState({ entry }: RejectedEntryStateProps) {
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
              {"submittedAt" in entry.state && (
                <span>
                  {" "}
                  • Submitted{" "}
                  {new Date(entry.state.submittedAt).toLocaleDateString()}
                </span>
              )}
              {"rejectedAt" in entry.state && (
                <span>
                  {" "}
                  • Rejected{" "}
                  {new Date(entry.state.rejectedAt).toLocaleDateString()}
                </span>
              )}
            </Text>
          </Stack>
          <Badge color="red" variant="light">
            Rejected
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
        <Alert color="red" variant="light" icon={<IconX size={16} />}>
          Unfortunately, your entry was not approved for the competition.
        </Alert>
      </Stack>
    </Card>
  );
}
