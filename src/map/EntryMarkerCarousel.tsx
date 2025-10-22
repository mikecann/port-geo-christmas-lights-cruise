import { AspectRatio, Center, Loader, Stack, Text } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { IconPhoto } from "@tabler/icons-react";
import { useState, useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import type { ApprovedEntryDoc } from "../../convex/features/entries/schema";
import { usePhotoUrl } from "../common/hooks/usePhotoUrl";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { PhotoDoc } from "../../convex/features/photos/schema";

function PhotoSlide({ photo }: { photo: PhotoDoc }) {
  const imageUrl = usePhotoUrl(photo, { size: "sm" }); // Small size for map carousel
  if (!imageUrl) return null;

  return (
    <Carousel.Slide>
      <AspectRatio ratio={16 / 10}>
        <img
          src={imageUrl}
          alt="Entry photo"
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AspectRatio>
    </Carousel.Slide>
  );
}

export default function EntryMarkerCarousel({
  entry,
}: {
  entry: ApprovedEntryDoc;
}) {
  const photos = useQuery(api.public.photos.listForEntry, {
    entryId: entry._id,
  });
  const autoplay = useRef(Autoplay({ delay: 3000 }));

  if (!photos) return <Loader />;

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
      height={160}
      emblaOptions={{
        loop: photos.length > 1,
        dragFree: false,
        align: "center",
      }}
      plugins={[autoplay.current]}
      onMouseEnter={() => autoplay.current?.stop?.()}
      onMouseLeave={() => autoplay.current?.play?.()}
      controlSize={28}
      style={{
        "--carousel-control-bg": "rgba(0, 0, 0, 0.6)",
        "--carousel-control-color": "white",
        "--carousel-indicator-size": "8px",
        "--carousel-indicator-bg": "rgba(255, 255, 255, 0.4)",
        "--carousel-indicator-bg-active": "white",
      }}
    >
      {photos.map((photo) => (
        <PhotoSlide key={photo._id} photo={photo} />
      ))}
    </Carousel>
  );
}
