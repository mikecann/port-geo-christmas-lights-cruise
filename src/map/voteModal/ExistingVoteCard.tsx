import {
  Card,
  Stack,
  Group,
  Text,
  Image,
  AspectRatio,
  Center,
  Divider,
  Button,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconPhoto,
  IconExternalLink,
} from "@tabler/icons-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { usePhotoUrl } from "../../common/hooks/usePhotoUrl";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { ApprovedEntryDoc } from "../../../convex/features/entries/schema";

export interface ExistingVoteCardProps {
  vote: Doc<"votes">;
  onCancel: () => void;
  onViewEntry: (entryId: Id<"entries">) => void;
  currentEntryId?: Id<"entries">;
}

export default function ExistingVoteCard({
  vote,
  onCancel,
  onViewEntry,
  currentEntryId,
}: ExistingVoteCardProps) {
  const entry = useQuery(api.public.entries.get, {
    entryId: vote.entryId,
  });
  const isCurrentEntry = currentEntryId === vote.entryId;
  const photo = useQuery(
    api.public.photos.findFirstForEntry,
    entry
      ? {
          entryId: entry._id,
        }
      : "skip",
  );
  const photoUrl = usePhotoUrl(photo, { size: "sm" });

  return (
    <Card
      withBorder
      padding="sm"
      style={{ borderColor: "var(--mantine-color-green-9)" }}
    >
      <Stack gap="xs">
        <Group gap="xs">
          <IconCircleCheck size={16} color="var(--mantine-color-green-7)" />
          <Text fw={600} c="green.9" size="sm">
            {isCurrentEntry
              ? "You've already voted for this entry!"
              : "You've already voted!"}
          </Text>
        </Group>

        {!isCurrentEntry && (
          <>
            <Text size="xs" c="dimmed" mb="xs">
              Your current vote is for:
            </Text>

            <Card
              withBorder
              padding="sm"
              style={{ cursor: "pointer" }}
              onClick={() => onViewEntry(vote.entryId)}
            >
              <Group gap="xs">
                {photoUrl ? (
                  <AspectRatio ratio={1} w={48}>
                    <Image
                      src={photoUrl}
                      alt={entry?.name ?? ""}
                      radius="sm"
                      fit="cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </AspectRatio>
                ) : (
                  <Center
                    w={48}
                    h={48}
                    bg="gray.1"
                    style={{ borderRadius: "var(--mantine-radius-sm)" }}
                  >
                    <IconPhoto size={20} color="var(--mantine-color-gray-5)" />
                  </Center>
                )}

                <div style={{ flex: 1 }}>
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={600} size="xs" lineClamp={2}>
                        {entry?.name ?? ""}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Entry #{entry?.entryNumber ?? ""}
                      </Text>
                    </div>
                    <IconExternalLink
                      size={14}
                      color="var(--mantine-color-gray-6)"
                    />
                  </Group>
                </div>
              </Group>
            </Card>

            <Divider />

            <Group justify="space-between">
              <Button variant="subtle" color="red" size="xs" onClick={onCancel}>
                Change Vote
              </Button>
            </Group>
          </>
        )}

        {isCurrentEntry && (
          <>
            <Divider />
            <Button
              variant="subtle"
              color="red"
              size="xs"
              onClick={onCancel}
              fullWidth
            >
              Change Vote
            </Button>
          </>
        )}
      </Stack>
    </Card>
  );
}
