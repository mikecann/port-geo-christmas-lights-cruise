import { Text, SimpleGrid, Stack } from "@mantine/core";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import AdminPhotoCard from "./AdminPhotoCard";
import AdminPhotoUpload from "./AdminPhotoUpload";

// Past entries' photos are kept as they were
export default function EntryPhotosSection({
  entryId,
  canEdit,
}: {
  entryId: Id<"entries">;
  canEdit: boolean;
}) {
  const photos =
    useQuery(api.admin.competition.photos.listForEntry, { entryId }) ?? [];

  return (
    <Stack gap="md">
      {photos.length > 0 ? (
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          {photos.map((photo) => (
            <AdminPhotoCard key={photo._id} photo={photo} canRemove={canEdit} />
          ))}
        </SimpleGrid>
      ) : (
        <Text size="sm" c="dimmed">
          No photos yet.
        </Text>
      )}

      {canEdit && (
        <AdminPhotoUpload entryId={entryId} currentPhotoCount={photos.length} />
      )}
    </Stack>
  );
}
