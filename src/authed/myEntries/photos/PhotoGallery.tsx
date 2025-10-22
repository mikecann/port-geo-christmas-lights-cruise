import { SimpleGrid, Text, Stack, Box, Center } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";
import type { PhotoDoc } from "../../../../convex/features/photos/schema";
import PhotoCard from "./PhotoCard";

interface PhotoGalleryProps {
  photos: PhotoDoc[];
  canRemove?: boolean;
  emptyMessage?: string;
  showEmptyState?: boolean;
}

export default function PhotoGallery({
  photos,
  canRemove = false,
  emptyMessage = "No photos uploaded yet.",
  showEmptyState = true,
}: PhotoGalleryProps) {
  if (photos.length === 0) {
    if (!showEmptyState) return null;

    return (
      <Box p="xl" style={{ border: "2px dashed #dee2e6", borderRadius: "8px" }}>
        <Center>
          <Stack gap="sm" align="center">
            <IconPhoto size={32} color="#868e96" />
            <Text size="sm" c="dimmed" ta="center">
              {emptyMessage}
            </Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <SimpleGrid
      cols={{ base: 2, sm: 3 }}
      spacing="sm"
      style={{ alignItems: "start" }}
    >
      {photos.map((photo) => (
        <PhotoCard key={photo._id} photo={photo} canRemove={canRemove} />
      ))}
    </SimpleGrid>
  );
}
