import type { ReactNode } from "react";
import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconInfoCircle,
  IconMapPin,
  IconRotate,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useMe } from "../../../../auth/useMeHooks";
import { useConfirmation } from "../../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../../common/errors";
import { routes } from "../../../../routes";
import EntryChecks from "../EntryChecks";
import EntryStatusBadge from "../EntryStatusBadge";
import ReviewActions from "../ReviewActions";
import EntryHistory from "./EntryHistory";
import EntryNumberSection from "./EntryNumberSection";
import EntryPhotosSection from "./EntryPhotosSection";

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          {help && (
            <Text size="sm" c="dimmed">
              {help}
            </Text>
          )}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

export default function EntryDetailPage({
  entryId,
}: {
  entryId: Id<"entries">;
}) {
  const detail = useQuery(api.admin.competition.entries.get, { entryId });
  const me = useMe();

  const backLink = (
    <Anchor {...routes.adminEntries().link} size="sm">
      <Group gap={4}>
        <IconArrowLeft size={14} />
        All entries
      </Group>
    </Anchor>
  );

  if (detail === undefined)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  if (detail === null)
    return (
      <Stack gap="md">
        {backLink}
        <Alert color="gray" icon={<IconInfoCircle size={16} />}>
          This entry doesn't exist any more. It may have been deleted.
        </Alert>
      </Stack>
    );

  const { entry, submitter, isCurrent } = detail;

  return (
    <Stack gap="lg">
      {backLink}

      <Stack gap={6}>
        <Group gap="sm">
          {entry.state.kind !== "rejected" &&
            entry.state.entryNumber !== undefined && (
              <Badge
                size="xl"
                variant="light"
                color={detail.isNumberOutsideRange ? "orange" : "blue"}
              >
                #{entry.state.entryNumber}
              </Badge>
            )}
          <Text component="h1" fz={{ base: 22, sm: 28 }} fw={700} lh={1.2}>
            {entry.state.name || "No name yet"}
          </Text>
        </Group>
        <Group gap="xs">
          <EntryStatusBadge status={entry.state.kind} />
          {!isCurrent && <Badge variant="outline">{detail.year}</Badge>}
        </Group>
        {entry.state.houseAddress && (
          <Group gap={6} wrap="nowrap">
            <IconMapPin size={14} color="gray" />
            <Text size="sm" c="dimmed">
              {entry.state.houseAddress.address}
            </Text>
          </Group>
        )}
      </Stack>

      {!isCurrent && (
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
          This is an entry from {detail.year}. Past entries are kept as a record
          and can't be changed.
        </Alert>
      )}

      {(entry.state.kind === "draft" || entry.state.kind === "submitting") && (
        <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
          They've started this entry but haven't sent it in for review yet, so
          there's nothing to approve.
        </Alert>
      )}

      {entry.state.kind === "submitted" && isCurrent && (
        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Text fw={600}>This entry is waiting for your review</Text>
            <ReviewActions entryId={entry._id} entryName={entry.state.name} />
          </Stack>
        </Card>
      )}

      {entry.state.kind === "rejected" && (
        <RejectedNotice
          entryId={entry._id}
          reason={entry.state.rejectedReason}
          canReopen={isCurrent}
        />
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Section title="Checks">
          <EntryChecks
            entry={entry}
            previous={detail.previous}
            checks={detail.checks}
            isNumberOutsideRange={detail.isNumberOutsideRange}
          />
        </Section>

        <Section title="Entrant">
          {submitter ? (
            <Group gap="sm" wrap="nowrap">
              <Avatar src={submitter.image} radius="xl">
                {submitter.name?.[0]?.toUpperCase()}
              </Avatar>
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="sm" fw={500}>
                  {submitter.name || "No name given"}
                </Text>
                {submitter.email && (
                  <Anchor
                    size="sm"
                    href={`mailto:${submitter.email}`}
                    style={{ wordBreak: "break-all" }}
                  >
                    {submitter.email}
                  </Anchor>
                )}
              </Stack>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              Their account has been deleted.
            </Text>
          )}
        </Section>
      </SimpleGrid>

      {isCurrent && (
        <Section
          title="Number"
          help="Entrants keep the same number every year, because the signs are reused."
        >
          <EntryNumberSection
            key={`${entry._id}-${entry.state.entryNumber}`}
            entry={entry}
          />
        </Section>
      )}

      <Section
        title="Photos"
        help={
          isCurrent
            ? "You can add photos for them or take down any that aren't suitable."
            : undefined
        }
      >
        <EntryPhotosSection entryId={entry._id} canEdit={isCurrent} />
      </Section>

      <Section title="History">
        <EntryHistory entry={entry} earlierEntries={detail.earlierEntries} />
      </Section>

      {me?.isSystemAdmin && isCurrent && (
        <DeleteEntryCard entryId={entry._id} />
      )}
    </Stack>
  );
}

function RejectedNotice({
  entryId,
  reason,
  canReopen,
}: {
  entryId: Id<"entries">;
  reason: string;
  canReopen: boolean;
}) {
  const { confirm } = useConfirmation();
  const [reopen, isReopening] = useErrorCatchingMutation(
    api.admin.competition.entries.reopen,
  );

  return (
    <Alert color="red" variant="light" title="Why it was rejected">
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{reason}</Text>
        {canReopen && (
          <Button
            size="xs"
            variant="default"
            leftSection={<IconRotate size={14} />}
            loading={isReopening}
            onClick={async () => {
              const confirmed = await confirm({
                title: "Send back for review?",
                content:
                  "Use this if it was rejected by mistake. It goes back in the review queue and they'll get an email when you approve or reject it again.",
                confirmButton: "Send back for review",
              });
              if (confirmed) await reopen({ entryId });
            }}
          >
            Send back for review
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

function DeleteEntryCard({ entryId }: { entryId: Id<"entries"> }) {
  const { confirm } = useConfirmation();
  const [deleteEntry, isDeleting] = useErrorCatchingMutation(
    api.admin.system.entries.deleteById,
  );

  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      style={{ borderColor: "var(--mantine-color-red-8)" }}
    >
      <Stack gap="sm" align="flex-start">
        <Text fw={600} c="red">
          Danger zone
        </Text>
        <Text size="sm" c="dimmed">
          Only system admins see this. Deleting removes the entry, its photos
          and any votes for it, and can't be undone.
        </Text>
        <Button
          color="red"
          variant="outline"
          leftSection={<IconTrash size={16} />}
          loading={isDeleting}
          onClick={async () => {
            const confirmed = await confirm({
              title: "Delete this entry?",
              content:
                "The entry, its photos and every vote for it will be deleted for good.",
              confirmButton: "Delete entry",
              confirmButtonColor: "red",
            });
            if (confirmed && (await deleteEntry({ entryId })))
              routes.adminEntries().push();
          }}
        >
          Delete entry
        </Button>
      </Stack>
    </Card>
  );
}
