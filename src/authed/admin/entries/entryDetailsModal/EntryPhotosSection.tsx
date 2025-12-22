import { Text, SimpleGrid, Card, Stack } from "@mantine/core";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import AdminPhotoCard from "./AdminPhotoCard";
import AdminPhotoUpload from "./AdminPhotoUpload";

export default function EntryPhotosSection({
  entry,
}: {
  entry: Doc<"entries">;
}) {
  const photos =
    useQuery(api.public.photos.listForEntry, { entryId: entry._id }) ?? [];

  return (
    <Card withBorder p="md">
      <Stack gap="md">
        <Text fw={500}>Photos ({photos.length})</Text>

        {photos.length > 0 && (
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
            {photos.map((photo) => (
              <AdminPhotoCard key={photo._id} photo={photo} />
            ))}
          </SimpleGrid>
        )}

        <AdminPhotoUpload entryId={entry._id} currentPhotoCount={photos.length} />
      </Stack>
    </Card>
  );
}
