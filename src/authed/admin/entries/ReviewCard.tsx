import {
  Anchor,
  Box,
  Card,
  Center,
  Grid,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconPhotoOff } from "@tabler/icons-react";
import { useState } from "react";
import type { AdminEntry } from "../../../../convex/admin/competition/entries";
import { routes } from "../../../routes";
import PhotoLightbox from "../../myEntries/photos/PhotoLightbox";
import EntryChecks from "./EntryChecks";
import { PhotoImage } from "./PhotoImage";
import ReviewActions from "./ReviewActions";

const sentDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

// One entry waiting for review, across the full width: photos big enough to
// judge on the left, who and where with the checks in the middle, and the
// decision on the right
export default function ReviewCard({ entry }: { entry: AdminEntry }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { photos, submitter } = entry;

  if (entry.state.kind !== "submitted") return null;

  return (
    <Card withBorder radius="md" padding="lg">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 5 }}>
          {photos.length > 0 ? (
            <SimpleGrid cols={photos.length === 1 ? 1 : 2} spacing="xs">
              {photos.map((photo) => (
                <PhotoImage
                  key={photo._id}
                  photo={photo}
                  height={photos.length > 2 ? 100 : 150}
                  onImageClick={setLightboxUrl}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Center
              h={150}
              bg="dark.7"
              style={{ borderRadius: "var(--mantine-radius-sm)" }}
            >
              <Stack gap={4} align="center">
                <IconPhotoOff size={22} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  No photos
                </Text>
              </Stack>
            </Center>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 8, md: 4.5 }}>
          <Stack gap="sm">
            <Stack gap={2}>
              <Text fw={600} size="lg" lh={1.3}>
                {entry.state.name}
              </Text>
              <Text size="sm" c="dimmed">
                {entry.state.houseAddress.address}
              </Text>
              <Text size="sm" c="dimmed" style={{ wordBreak: "break-word" }}>
                {[submitter?.name, submitter?.email]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text size="xs" c="dimmed">
                Sent {sentDate(entry.state.submittedAt)}
              </Text>
            </Stack>
            <EntryChecks
              entry={entry}
              previous={entry.previous}
              checks={entry.checks}
              isNumberOutsideRange={entry.isNumberOutsideRange}
            />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 4, md: 2.5 }}>
          <Stack gap="sm" h="100%" justify="space-between">
            <ReviewActions
              entryId={entry._id}
              entryName={entry.state.name}
              stacked
            />
            <Box ta="center">
              <Anchor
                size="sm"
                {...routes.adminEntry({ entryId: entry._id }).link}
              >
                Open entry
              </Anchor>
            </Box>
          </Stack>
        </Grid.Col>
      </Grid>

      <PhotoLightbox
        opened={lightboxUrl !== null}
        onClose={() => setLightboxUrl(null)}
        imageUrl={lightboxUrl}
      />
    </Card>
  );
}
