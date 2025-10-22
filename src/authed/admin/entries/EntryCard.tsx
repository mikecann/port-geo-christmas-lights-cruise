import {
  Card,
  Group,
  Text,
  Badge,
  Stack,
  SimpleGrid,
  Box,
  Button,
} from "@mantine/core";
import {
  IconMapPin,
  IconCalendar,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import React from "react";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";
import PhotoLightbox from "../../myEntries/photos/PhotoLightbox";
import { getAddressString } from "../../../../shared/misc";
import { PhotoImage } from "./PhotoImage";
import { useQuery } from "convex/react";

export default function EntryCard({ entry }: { entry: Doc<"entries"> }) {
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string>("");
  const photos =
    useQuery(api.my.photos.listForEntry, { entryId: entry._id }) ?? [];

  const [approveEntry, isApproving] = useErrorCatchingMutation(
    api.admin.competition.entries.approve,
  );
  const [rejectEntry, isRejecting] = useErrorCatchingMutation(
    api.admin.competition.entries.reject,
  );
  const { confirm } = useConfirmation();

  if (entry.status !== "submitted") return null;

  const submittedDate = new Date(entry.submittedAt).toLocaleDateString();

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          <Stack gap="0">
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Text fw={500} size="lg" lineClamp={1}>
                  {entry.name}
                </Text>
              </div>
              <Badge color="yellow" variant="light">
                Pending Review
              </Badge>
            </Group>

            <Group gap="xs" mt="xs">
              <IconMapPin size={14} color="gray" />
              <Text size="sm" c="dimmed" lineClamp={1}>
                {getAddressString(entry.houseAddress)}
              </Text>
            </Group>
          </Stack>

          {photos.length > 0 && (
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Photos ({photos.length})
              </Text>
              <SimpleGrid cols={4} spacing="xs">
                {photos.map((photo, i) => {
                  return (
                    <PhotoImage
                      key={photo._id}
                      photo={photo}
                      index={i}
                      onImageClick={(imageUrl) => {
                        setSelectedImageUrl(imageUrl);
                        openModal();
                      }}
                    />
                  );
                })}
              </SimpleGrid>
            </Box>
          )}

          <Group justify="space-between" align="center">
            <Group gap="xs">
              <IconCalendar size={14} color="gray" />
              <Text size="sm" c="dimmed">
                Submitted {submittedDate}
              </Text>
            </Group>
          </Group>

          {/* Admin Action Buttons */}
          <Group gap="sm" mt="md">
            <Button
              leftSection={<IconCheck size={16} />}
              color="green"
              variant="filled"
              size="sm"
              flex={1}
              onClick={() => approveEntry({ entryId: entry._id })}
              loading={isApproving}
            >
              Approve
            </Button>
            <Button
              leftSection={<IconX size={16} />}
              color="red"
              variant="outline"
              size="sm"
              flex={1}
              onClick={async () => {
                const confirmed = await confirm({
                  title: "Reject Entry",
                  content: `Are you sure you want to reject "${entry.name}" at ${entry.houseAddress}? This action cannot be undone.`,
                  confirmButton: "Reject Entry",
                  cancelButton: "Cancel",
                  confirmButtonColor: "red",
                });
                if (!confirmed) return;
                rejectEntry({ entryId: entry._id });
              }}
              loading={isRejecting}
            >
              Deny
            </Button>
          </Group>
        </Stack>
      </Card>

      <PhotoLightbox
        opened={modalOpened}
        onClose={closeModal}
        imageUrl={selectedImageUrl}
      />
    </>
  );
}
