import {
  Card,
  Image,
  Text,
  Badge,
  Stack,
  Group,
  Box,
  AspectRatio,
  Center,
} from "@mantine/core";
import { IconMapPin, IconPhoto } from "@tabler/icons-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { routes } from "../../routes";
import { getAddressString } from "../../../shared/misc";
import { usePhotoUrl } from "../../common/hooks/usePhotoUrl";

interface EntryGalleryCardProps {
  entry: Doc<"entries">;
  photo: Doc<"photos"> | null;
}

export default function EntryGalleryCard({
  entry,
  photo,
}: EntryGalleryCardProps) {
  const firstPhotoUrl = usePhotoUrl(photo, { size: "sm" });

  if (entry.status !== "approved") return null;

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "pointer",
      }}
      onClick={() => {
        routes.entry({ entryId: entry._id }).push();
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <Stack gap="md">
        {/* First Photo */}
        <Box>
          {firstPhotoUrl ? (
            <AspectRatio ratio={16 / 12}>
              <Image
                src={firstPhotoUrl}
                alt={`${entry.name} - Christmas lights display`}
                radius="sm"
                fit="cover"
                loading="lazy"
                decoding="async"
              />
            </AspectRatio>
          ) : (
            <AspectRatio ratio={16 / 12}>
              <Center
                bg="var(--mantine-color-gray-9)"
                style={{ borderRadius: "var(--mantine-radius-sm)" }}
              >
                <Stack gap="xs" align="center">
                  <IconPhoto size={32} color="var(--mantine-color-gray-5)" />
                  <Text size="sm" c="dimmed">
                    No photos available
                  </Text>
                </Stack>
              </Center>
            </AspectRatio>
          )}
        </Box>

        {/* Entry Header */}
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            <Text fw={600} size="lg" lineClamp={2}>
              {entry.name}
            </Text>
            <Badge color="blue" variant="filled" size="sm">
              #{entry.entryNumber}
            </Badge>
          </Group>

          <Group gap="xs" align="flex-start">
            <IconMapPin
              size={16}
              color="var(--mantine-color-gray-6)"
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Text size="sm" c="dimmed" lineClamp={2}>
              {getAddressString(entry.houseAddress)}
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
