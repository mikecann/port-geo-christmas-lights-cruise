import { Card, Stack, Text } from "@mantine/core";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";
import EntryCardHeader from "./EntryCardHeader";
import EntryStatusBadge from "../EntryStatusBadge";

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
        <EntryCardHeader
          entry={entry}
          status={<EntryStatusBadge status="submitted" />}
        />

        <Text size="sm" c="dimmed">
          {entry.state.houseAddress?.address}
        </Text>

        {photos.length > 0 && (
          <PhotoGallery photos={photos} showEmptyState={false} />
        )}

        <Text size="sm">
          We'll email you when it's reviewed. You can add photos again once it's
          approved.
        </Text>
      </Stack>
    </Card>
  );
}
