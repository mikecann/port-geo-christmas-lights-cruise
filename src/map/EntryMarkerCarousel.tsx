import { AspectRatio, Center, Loader, Stack, Text } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import "@mantine/carousel/styles.css";
import { IconPhoto } from "@tabler/icons-react";
import type { PublicEntry } from "../../convex/features/entries/schema";
import { usePhotoUrl } from "../common/hooks/usePhotoUrl";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { PublicPhoto } from "../../convex/features/photos/schema";
import { routes } from "../routes";

const HEIGHT = 140;

function PhotoSlide({
  photo,
  entry,
}: {
  photo: PublicPhoto;
  entry: PublicEntry;
}) {
  const imageUrl = usePhotoUrl(photo, { size: "sm" }); // Small size for map carousel
  if (!imageUrl) return null;

  return (
    <Carousel.Slide>
      {/* Tapping the photo opens the entry. Embla swallows the click after a
          swipe, so swiping between photos doesn't navigate. */}
      <a
        {...routes.entry({ entryId: entry._id }).link}
        style={{ display: "block", height: HEIGHT }}
      >
        <img
          src={imageUrl}
          alt={entry.name}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </a>
    </Carousel.Slide>
  );
}

// No autoplay: photos sliding by on their own while you read is distracting
export default function EntryMarkerCarousel({ entry }: { entry: PublicEntry }) {
  const photos = useQuery(api.public.photos.listForEntry, {
    entryId: entry._id,
  });

  if (!photos)
    return (
      <Center h={HEIGHT}>
        <Loader size="sm" />
      </Center>
    );

  if (photos.length === 0)
    return (
      <AspectRatio ratio={16 / 10}>
        <Center bg="gray.1">
          <Stack gap="xs" align="center">
            <IconPhoto size={32} color="var(--mantine-color-gray-5)" />
            <Text size="sm" c="gray.6">
              No photos
            </Text>
          </Stack>
        </Center>
      </AspectRatio>
    );

  return (
    <Carousel
      withIndicators={photos.length > 1}
      withControls={photos.length > 1}
      height={HEIGHT}
      emblaOptions={{
        loop: photos.length > 1,
        dragFree: false,
        align: "center",
      }}
      controlSize={26}
      style={{
        "--carousel-control-bg": "rgba(0, 0, 0, 0.6)",
        "--carousel-control-color": "white",
        "--carousel-indicator-size": "8px",
        "--carousel-indicator-bg": "rgba(255, 255, 255, 0.4)",
        "--carousel-indicator-bg-active": "white",
      }}
    >
      {photos.map((photo) => (
        <PhotoSlide key={photo._id} photo={photo} entry={entry} />
      ))}
    </Carousel>
  );
}
