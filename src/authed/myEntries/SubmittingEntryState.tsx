import { Card, Stack, Text, Group, Loader } from "@mantine/core";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";
import EntryCardHeader from "./EntryCardHeader";

interface SubmittingEntryStateProps {
  entry: Doc<"entries">;
}

// Only lasts the few seconds it takes to check the address
export default function SubmittingEntryState({
  entry,
}: SubmittingEntryStateProps) {
  const photos = useQuery(api.my.photos.list) ?? [];

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <EntryCardHeader
          entry={entry}
          status={
            <Group gap={6} wrap="nowrap">
              <Loader size={12} />
              <Text size="sm">Sending in…</Text>
            </Group>
          }
        />

        <Text size="sm" c="dimmed">
          {entry.state.houseAddress?.address}
        </Text>

        {photos.length > 0 && (
          <PhotoGallery photos={photos} showEmptyState={false} />
        )}
      </Stack>
    </Card>
  );
}
