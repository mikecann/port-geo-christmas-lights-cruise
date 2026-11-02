import {
  Anchor,
  Card,
  Stack,
  Text,
  Group,
  TextInput,
  ActionIcon,
  Tooltip,
  List,
} from "@mantine/core";
import {
  IconPencil,
  IconCheck,
  IconX,
  IconChevronRight,
} from "@tabler/icons-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoSection from "./photos/PhotoSection";
import { useErrorCatchingMutation } from "../../common/errors";
import { MAX_ENTRY_NAME_LENGTH } from "../../../shared/constants";
import { eventForYear } from "../../../shared/event";
import { routes } from "../../routes";
import EntryCardHeader from "./EntryCardHeader";
import EntryStatusBadge from "../EntryStatusBadge";
import EntryNameLabel from "./EntryNameLabel";
import { approvedNextSteps } from "./nextSteps";

interface ApprovedEntryStateProps {
  entry: Doc<"entries">;
}

export default function ApprovedEntryState({ entry }: ApprovedEntryStateProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(entry.state.name || "");
  const photos = useQuery(api.my.photos.list) ?? [];
  const competition = useQuery(api.public.competitions.current, {});
  const steps = approvedNextSteps(
    competition ? eventForYear(competition.year) : null,
  );

  const [updateEntry, isSaving] = useErrorCatchingMutation(
    api.my.entries.updateApproved,
  );

  const handleSaveName = () => {
    // An approved entry is on the map by its name, so it can't go blank
    if (!editedName.trim() || editedName === entry.state.name) {
      cancelNameEdit();
      return;
    }

    updateEntry({ name: editedName });
    setIsEditingName(false);
  };

  const cancelNameEdit = () => {
    setEditedName(entry.state.name || "");
    setIsEditingName(false);
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <EntryCardHeader
          entry={entry}
          title={
            isEditingName ? (
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <TextInput
                  label={<EntryNameLabel />}
                  value={editedName}
                  maxLength={MAX_ENTRY_NAME_LENGTH}
                  onChange={(e) => setEditedName(e.currentTarget.value)}
                  style={{ flex: 1 }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") cancelNameEdit();
                  }}
                />
                <ActionIcon
                  variant="light"
                  size="lg"
                  loading={isSaving}
                  onClick={handleSaveName}
                  aria-label="Save name"
                >
                  <IconCheck size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={cancelNameEdit}
                  aria-label="Cancel"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ) : (
              <Group gap={6} wrap="nowrap" align="center">
                <Text
                  fw={600}
                  fz={20}
                  lh={1.25}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {entry.state.name || "Your entry"}
                </Text>
                <Tooltip label="Change the name">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                    aria-label="Change the name"
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )
          }
          status={<EntryStatusBadge status="approved" />}
        />

        <Text size="sm" c="dimmed">
          {entry.state.houseAddress?.address}
        </Text>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            What happens next
          </Text>
          <List type="ordered" size="sm" spacing={4}>
            {steps.map((step) => (
              <List.Item key={step}>{step}</List.Item>
            ))}
          </List>
          <Anchor
            size="sm"
            {...routes.entry({ entryId: entry._id }).link}
            style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
          >
            See it on the site
            <IconChevronRight size={14} />
          </Anchor>
        </Stack>

        <PhotoSection photos={photos} canUpload={true} canRemove={true} />
      </Stack>
    </Card>
  );
}
