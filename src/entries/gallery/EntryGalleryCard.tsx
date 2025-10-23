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
      padding={0}
      radius="lg"
      withBorder
      style={{
        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        cursor: "pointer",
        overflow: "hidden",
      }}
      onClick={() => {
        routes.entry({ entryId: entry._id }).push();
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 30px rgba(251, 175, 93, 0.2)";
        e.currentTarget.style.borderColor = "#FBAF5D";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "";
      }}
    >
      <Stack gap={0}>
        {/* First Photo with Entry Number Overlay */}
        <Box style={{ position: "relative" }}>
          {firstPhotoUrl ? (
            <AspectRatio ratio={16 / 12}>
              <Image
                src={firstPhotoUrl}
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
          {/* Prominent Entry Number Badge */}
          <Box
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "#FBAF5D",
              color: "#0b1c3b",
              padding: "6px 12px",
              borderRadius: "var(--mantine-radius-md)",
              fontWeight: 700,
              fontSize: "1rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            }}
          >
            #{entry.entryNumber}
          </Box>
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
              {getAddressString(entry.houseAddress)}
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
