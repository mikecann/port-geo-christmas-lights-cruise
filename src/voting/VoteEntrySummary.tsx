import { AspectRatio, Badge, Center, Group, Stack, Text } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";
import type { PublicPhoto } from "../../convex/features/photos/schema";
import { usePhotoSrcSet } from "../common/hooks/usePhotoUrl";

// Small enough for patchy mobile data; the page is at most 36em wide
const VOTE_PHOTO = {
  widths: [480, 780],
  sizes: "(max-width: 36em) 100vw, 576px",
  fallbackWidth: 480,
};

// The photo, number and name, so people know they've got the right house
export default function VoteEntrySummary({
  entry,
  photo,
}: {
  entry: { name: string; entryNumber: number };
  photo: PublicPhoto | undefined;
}) {
  const image = usePhotoSrcSet(photo, VOTE_PHOTO);

  return (
    <Stack gap="sm">
      <AspectRatio ratio={4 / 3}>
        {image ? (
          <img
            {...image}
            alt={`${entry.name} - Christmas lights display`}
            fetchPriority="high"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "var(--mantine-radius-md)",
            }}
          />
        ) : (
          <Center
            bg="var(--mantine-color-gray-9)"
            style={{ borderRadius: "var(--mantine-radius-md)" }}
          >
            <IconPhoto size={48} color="var(--mantine-color-gray-5)" />
          </Center>
        )}
      </AspectRatio>
      <Group gap="sm" wrap="nowrap">
        <Badge size="xl" color="yellow" variant="filled">
          #{entry.entryNumber}
        </Badge>
        <Text fw={700} size="xl" lineClamp={2}>
          {entry.name}
        </Text>
      </Group>
    </Stack>
  );
}
