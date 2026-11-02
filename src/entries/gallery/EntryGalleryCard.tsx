import {
  Card,
  Image,
  Text,
  Stack,
  Group,
  Box,
  AspectRatio,
  Center,
} from "@mantine/core";
import { IconMapPin, IconPhoto } from "@tabler/icons-react";
import type { PublicEntry } from "../../../convex/features/entries/schema";
import type { PublicPhoto } from "../../../convex/features/photos/schema";
import { routes } from "../../routes";
import { usePhotoSrcSet } from "../../common/hooks/usePhotoUrl";
import { EntryNumber } from "../../common/components/EntryNumber";
import { shortAddress } from "../../common/utils/address";
import styles from "./EntryGalleryCard.module.css";

// One column on phones, two from sm and three from lg, in a size="xl" container
const CARD_PHOTO = {
  widths: [400, 700],
  sizes: "(max-width: 48em) 100vw, (max-width: 75em) 50vw, 440px",
  fallbackWidth: 700,
} as const;

interface EntryGalleryCardProps {
  entry: PublicEntry;
  photo: PublicPhoto | null;
}

export default function EntryGalleryCard({
  entry,
  photo,
}: EntryGalleryCardProps) {
  const firstPhoto = usePhotoSrcSet(photo, CARD_PHOTO);

  return (
    <Card
      component="a"
      {...routes.entry({ entryId: entry._id }).link}
      data-testid="entry-gallery-card"
      data-entry-number={entry.entryNumber}
      shadow="sm"
      padding={0}
      radius="lg"
      withBorder
      className={styles.card}
    >
      <Stack gap={0}>
        {/* First Photo with Entry Number Overlay */}
        <Box style={{ position: "relative" }}>
          {firstPhoto ? (
            <AspectRatio ratio={16 / 12}>
              <Image
                {...firstPhoto}
                alt={`${entry.name} - Christmas lights display`}
                radius={0}
                fit="cover"
                loading="lazy"
                decoding="async"
              />
            </AspectRatio>
          ) : (
            <AspectRatio ratio={16 / 12}>
              <Center bg="var(--mantine-color-gray-9)">
                <Stack gap="xs" align="center">
                  <IconPhoto size={32} color="var(--mantine-color-gray-5)" />
                  <Text size="sm" c="dimmed">
                    No photos available
                  </Text>
                </Stack>
              </Center>
            </AspectRatio>
          )}
          <EntryNumber
            number={entry.entryNumber}
            size="md"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            }}
          />
        </Box>

        {/* Entry Info */}
        <Stack gap="md" p="lg">
          <Text fw={700} size="xl" lineClamp={2} style={{ lineHeight: 1.3 }}>
            {entry.name}
          </Text>

          <Group gap="xs" align="flex-start">
            <IconMapPin
              size={18}
              color="var(--mantine-color-gray-6)"
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Text size="md" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
              {shortAddress(entry.houseAddress.address)}
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
