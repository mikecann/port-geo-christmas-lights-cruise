import { Image } from "@mantine/core";
import React from "react";
import { usePhotoUrl } from "../../../common/hooks/usePhotoUrl";
import type { PhotoDoc } from "../../../../convex/features/photos/schema";

export function PhotoImage({
  photo,
  onImageClick,
  height = 80,
}: {
  photo: PhotoDoc;
  onImageClick: (imageUrl: string) => void;
  height?: number;
}) {
  // Small sizes for admin cards; the lightbox opens the same URL
  const imageUrl = usePhotoUrl(photo, { size: height > 100 ? "sm" : "xs" });

  if (!imageUrl) return null;

  return (
    <Image
      src={imageUrl}
      alt="Entry photo"
      h={height}
      radius="sm"
      fit="cover"
      style={{
        cursor: "pointer",
        transition: "transform 0.2s ease",
        position: "relative",
      }}
      bg="dark.7"
      onClick={() => onImageClick(imageUrl)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    />
  );
}
