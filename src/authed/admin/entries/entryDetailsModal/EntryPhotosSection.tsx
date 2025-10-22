import { Text, SimpleGrid, Image, Card } from "@mantine/core";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { usePhotoUrl } from "../../../../common/hooks/usePhotoUrl";
import type { PhotoDoc } from "../../../../../convex/features/photos/schema";
import { api } from "../../../../../convex/_generated/api";
import { useQuery } from "convex/react";

function PhotoImage({
  photo,
  onImageClick,
}: {
  photo: PhotoDoc;
  onImageClick: (imageUrl: string) => void;
}) {
  const imageUrl = usePhotoUrl(photo, { size: "sm" }); // Small gallery items for admin
  const lightboxUrl = usePhotoUrl(photo); // Default (md) size for lightbox

  if (!imageUrl) return null;

  return (
    <Image
      src={imageUrl}
      alt="Entry photo"
      h={120}
      radius="sm"
      fit="cover"
      style={{
        cursor: "pointer",
        transition: "transform 0.2s ease",
        border: "1px solid #f1f3f4",
      }}
      onClick={() => onImageClick(lightboxUrl || imageUrl)} // Use original for lightbox
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    />
  );
}

export default function EntryPhotosSection({
  entry,
  onImageClick,
}: {
  entry: Doc<"entries">; // Photos are joined in the query
  onImageClick: (imageUrl: string) => void;
}) {
  const photos =
    useQuery(api.public.photos.listForEntry, { entryId: entry._id }) ?? [];

  return (
    <Card withBorder p="md">
      <Text fw={500} mb="md">
        Photos ({photos.length})
      </Text>
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        {photos.map((photo) => (
          <PhotoImage
            key={photo._id}
            photo={photo}
            onImageClick={onImageClick}
          />
        ))}
      </SimpleGrid>
    </Card>
  );
}
