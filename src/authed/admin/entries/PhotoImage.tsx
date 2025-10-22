import { Image } from "@mantine/core";
import React from "react";
import { usePhotoUrl } from "../../../common/hooks/usePhotoUrl";
import type { PhotoDoc } from "../../../../convex/features/photos/schema";

export function PhotoImage({
  photo,
  index,
  onImageClick,
}: {
  photo: PhotoDoc;
  index: number;
  onImageClick: (imageUrl: string) => void;
}) {
  const imageUrl = usePhotoUrl(photo, { size: "xs" }); // Small thumbnails for admin cards

  if (!imageUrl) return null;

  return (
    <Image
      src={imageUrl}
      alt="Entry photo"
      h={80}
      radius="sm"
      fit="contain"
      style={{
        cursor: "pointer",
        transition: "transform 0.2s ease",
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
