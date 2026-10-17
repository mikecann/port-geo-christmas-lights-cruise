import { Carousel } from "@mantine/carousel";
import { usePhotoSrcSet, usePhotoUrl } from "../common/hooks/usePhotoUrl";
import type { PublicPhoto } from "../../convex/features/photos/schema";
import { ENTRY_PHOTO } from "../../shared/photoUrls";

export function PhotoSlide({
  photo,
  entry,
  onImageClick,
  isPriority,
}: {
  photo: PublicPhoto;
  entry: { name: string };
  onImageClick: (imageUrl: string) => void;
  isPriority?: boolean;
}) {
  const image = usePhotoSrcSet(photo, ENTRY_PHOTO);
  const lightboxUrl = usePhotoUrl(photo, { size: "lg" });

  if (!image) return null;

  return (
    <Carousel.Slide>
      <div style={{ width: "100%", height: "100%" }}>
        <img
          {...image}
          alt={`${entry.name} - Christmas lights display`}
          loading={isPriority ? "eager" : "lazy"}
          decoding="async"
          // TS typing prefers camelCase for this attribute
          fetchPriority={isPriority ? "high" : ("low" as const)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            cursor: "pointer",
          }}
          onClick={() => onImageClick(lightboxUrl || image.src)}
        />
      </div>
    </Carousel.Slide>
  );
}
