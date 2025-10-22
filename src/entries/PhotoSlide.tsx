import { Carousel } from "@mantine/carousel";
import { usePhotoUrl } from "../common/hooks/usePhotoUrl";
import type { PhotoDoc } from "../../convex/features/photos/schema";

export function PhotoSlide({
  photo,
  entry,
  onImageClick,
  isPriority,
}: {
  photo: PhotoDoc;
  entry: { name: string };
  onImageClick: (imageUrl: string) => void;
  isPriority?: boolean;
}) {
  const imageUrl = usePhotoUrl(photo, { size: "md" }); // Medium size for carousel
  const lightboxUrl = usePhotoUrl(photo); // Default (md) size for lightbox

  if (!imageUrl) return null;

  return (
    <Carousel.Slide>
      <div style={{ width: "100%", height: "100%" }}>
        <img
          src={imageUrl}
          alt={`${entry.name} - Christmas lights display`}
          loading={isPriority ? "eager" : "lazy"}
          decoding="async"
          // TS typing prefers camelCase for this attribute
          fetchPriority={isPriority ? "high" : ("low" as const)}
          sizes="(max-width: 62rem) 100vw, 960px"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            cursor: "pointer",
          }}
          onClick={() => onImageClick(lightboxUrl || imageUrl)}
        />
      </div>
    </Carousel.Slide>
  );
}
