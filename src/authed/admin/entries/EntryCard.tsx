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
  IconUser,
  IconMail,
  IconShieldCheck,
  IconAlertCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";
import React from "react";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../../../../convex/_generated/api";
import type { AdminEntry } from "../../../../convex/admin/competition/entries";
import { useErrorCatchingMutation } from "../../../common/errors";
import PhotoLightbox from "../../myEntries/photos/PhotoLightbox";
import { PhotoImage } from "./PhotoImage";
import { useQuery } from "convex/react";
import RejectEntryModal from "./RejectEntryModal";

export default function EntryCard({ entry }: { entry: AdminEntry }) {
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [
    rejectModalOpened,
    { open: openRejectModal, close: closeRejectModal },
  ] = useDisclosure(false);
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string>("");
  const { photos, submitter: user } = entry;
  const validationStatus = useQuery(
    api.admin.competition.entries.getEntryValidationStatus,
    {
      entryId: entry._id,
    },
  );

  const [approveEntry, isApproving] = useErrorCatchingMutation(
    api.admin.competition.entries.approve,
  );
  const [rejectEntry, isRejecting] = useErrorCatchingMutation(
    api.admin.competition.entries.reject,
  );

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
                {entry.houseAddress.address}
              </Text>
            </Group>

            {user && (
              <>
                {user.name && (
                  <Group gap="xs" mt="xs">
                    <IconUser size={14} color="gray" />
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {user.name}
                    </Text>
                  </Group>
                )}
                {user.email && (
                  <Group gap="xs" mt="xs">
                    <IconMail size={14} color="gray" />
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {user.email}
                    </Text>
                  </Group>
                )}
              </>
            )}
          </Stack>

          {photos.length > 0 && (
            <Box>
              <Text size="sm" fw={500} mb="xs">
                Photos ({photos.length})
              </Text>
              <SimpleGrid cols={4} spacing="xs">
                {photos.map((photo) => {
                  return (
                    <PhotoImage
                      key={photo._id}
                      photo={photo}
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

          {validationStatus && (
            <>
              {!validationStatus.hasConflicts && (
                <Group gap="xs">
                  <IconShieldCheck size={14} color="green" />
                  <Text size="sm" c="dimmed">
                    No address conflicts found
                  </Text>
                </Group>
              )}
              {validationStatus.isWithinBoundary !== undefined && (
                <Group gap="xs">
                  {validationStatus.isWithinBoundary ? (
                    <>
                      <IconShieldCheck size={14} color="green" />
                      <Text size="sm" c="dimmed">
                        Within competition boundary
                      </Text>
                    </>
                  ) : (
                    <>
                      <IconAlertCircle size={14} color="orange" />
                      <Text size="sm" c="dimmed">
                        Outside competition boundary
                      </Text>
                    </>
                  )}
                </Group>
              )}
              <Group gap="xs">
                {validationStatus.isReturningEntrant ? (
                  <>
                    <IconShieldCheck size={14} color="green" />
                    <Text size="sm" c="dimmed">
                      Returning entrant: approved in an earlier year
                    </Text>
                  </>
                ) : (
                  <>
                    <IconAlertTriangle size={14} style={{ color: "#FFB800" }} />
                    <Text size="sm" c="dimmed">
                      New entrant: no approved entry in earlier years
                    </Text>
                  </>
                )}
              </Group>
            </>
          )}

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
              onClick={() => openRejectModal()}
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

      <RejectEntryModal
        opened={rejectModalOpened}
        onClose={closeRejectModal}
        onConfirm={(reason) => {
          rejectEntry({ entryId: entry._id, rejectedReason: reason });
          closeRejectModal();
        }}
        entryName={entry.name}
        loading={isRejecting}
      />
    </>
  );
}
