import { Anchor, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconMail, IconMapPin, IconUser } from "@tabler/icons-react";
import { useState } from "react";
import type { AdminEntry } from "../../../../convex/admin/competition/entries";
import { routes } from "../../../routes";
import PhotoLightbox from "../../myEntries/photos/PhotoLightbox";
import EntryChecks from "./EntryChecks";
import { PhotoImage } from "./PhotoImage";
import ReviewActions from "./ReviewActions";

export default function ReviewCard({ entry }: { entry: AdminEntry }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { photos, submitter } = entry;

  if (entry.status !== "submitted") return null;

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={600} size="lg">
            {entry.name}
          </Text>
          <Group gap={6} wrap="nowrap">
            <IconMapPin size={14} color="gray" />
            <Text size="sm" c="dimmed">
              {entry.houseAddress.address}
            </Text>
          </Group>
          {submitter?.name && (
            <Group gap={6} wrap="nowrap">
              <IconUser size={14} color="gray" />
              <Text size="sm" c="dimmed">
                {submitter.name}
              </Text>
            </Group>
          )}
          {submitter?.email && (
            <Group gap={6} wrap="nowrap">
              <IconMail size={14} color="gray" />
              <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
                {submitter.email}
              </Text>
            </Group>
          )}
          <Text size="xs" c="dimmed">
            Sent in {new Date(entry.submittedAt).toLocaleDateString()}
          </Text>
        </Stack>

        {photos.length > 0 ? (
          <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
            {photos.map((photo) => (
              <PhotoImage
                key={photo._id}
                photo={photo}
                onImageClick={setLightboxUrl}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="orange">
            No photos yet
          </Text>
        )}

        <EntryChecks
          entry={entry}
          previous={entry.previous}
          checks={entry.checks}
          isNumberOutsideRange={entry.isNumberOutsideRange}
        />

        <ReviewActions entryId={entry._id} entryName={entry.name} />
        <Anchor
          size="sm"
          ta="center"
          {...routes.adminEntry({ entryId: entry._id }).link}
        >
          See everything about this entry
        </Anchor>
      </Stack>

      <PhotoLightbox
        opened={lightboxUrl !== null}
        onClose={() => setLightboxUrl(null)}
        imageUrl={lightboxUrl}
      />
    </Card>
  );
}
