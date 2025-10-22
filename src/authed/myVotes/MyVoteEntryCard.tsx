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
  Button,
} from "@mantine/core";
import { IconMapPin, IconPhoto, IconX } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { routes } from "../../routes";
import { getAddressString } from "../../../shared/misc";
import { usePhotoUrl } from "../../common/hooks/usePhotoUrl";
import { useErrorCatchingMutation } from "../../common/errors";

type Props = {
  entryId: Id<"entries">;
  voteId: Id<"votes">;
};

export default function MyVoteEntryCard({ entryId, voteId }: Props) {
  const entryWithPhotos = useQuery(api.public.entries.getWithPhotos, {
    entryId,
  });
  const [cancelVote, isCancelling] = useErrorCatchingMutation(
    api.my.votes.cancel,
  );

  // Always call hooks before any early returns
  const firstPhotoUrl = usePhotoUrl(entryWithPhotos?.photos?.[0], {
    size: "sm",
  });

  // Early returns after all hooks
  if (!entryWithPhotos) return null;

  const { entry, photos } = entryWithPhotos;
  if (entry.status !== "approved") return null;

  return (
    <Card withBorder radius="md" padding="sm">
      <Stack gap="sm">
        <Card
          withBorder
          padding={0}
          radius="sm"
          style={{ cursor: "pointer" }}
          onClick={() => routes.entry({ entryId: entry._id }).push()}
        >
          <Stack gap="sm" p="sm">
            <Box>
              {photos.length > 0 && firstPhotoUrl ? (
                <AspectRatio ratio={16 / 12}>
                  <Image
                    src={firstPhotoUrl}
                    alt={entry.name}
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
                      <IconPhoto
                        size={32}
                        color="var(--mantine-color-gray-5)"
                      />
                      <Text size="sm" c="dimmed">
                        No photos available
                      </Text>
                    </Stack>
                  </Center>
                </AspectRatio>
              )}
            </Box>
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start">
                <Text fw={600} size="sm" lineClamp={2}>
                  {entry.name}
                </Text>
                <Badge color="blue" variant="filled" size="sm">
                  #{entry.entryNumber}
                </Badge>
              </Group>
              <Group gap="xs" align="flex-start">
                <IconMapPin
                  size={14}
                  color="var(--mantine-color-gray-6)"
                  style={{ marginTop: 2 }}
                />
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {getAddressString(entry.houseAddress)}
                </Text>
              </Group>
            </Stack>
          </Stack>
        </Card>
        <Button
          size="xs"
          variant="light"
          color="red"
          leftSection={<IconX size={14} />}
          fullWidth
          onClick={(e) => {
            e.stopPropagation();
            cancelVote({ voteId });
          }}
        >
          Cancel Vote
        </Button>
      </Stack>
    </Card>
  );
}
