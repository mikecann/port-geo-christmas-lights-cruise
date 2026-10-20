import {
  Card,
  Stack,
  Text,
  Group,
  Badge,
  TextInput,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconEdit, IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoSection from "./photos/PhotoSection";
import { useErrorCatchingMutation } from "../../common/errors";
import { MAX_ENTRY_NAME_LENGTH } from "../../../shared/constants";
import EntryNumberBadge from "./EntryNumberBadge";

interface ApprovedEntryStateProps {
  entry: Doc<"entries">;
}

export default function ApprovedEntryState({ entry }: ApprovedEntryStateProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(entry.state.name || "");
  const photos = useQuery(api.my.photos.list) ?? [];

  const [updateEntry, isSaving] = useErrorCatchingMutation(
    api.my.entries.updateApproved,
  );

  const handleSaveName = async () => {
    if (editedName === entry.state.name) {
      setIsEditingName(false);
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
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="sm" align="center">
              <Text fw={500} size="lg">
                Your Competition Entry
              </Text>
              <EntryNumberBadge entry={entry} />
            </Group>
          </Stack>
          <Badge color="green" variant="light">
            Approved
          </Badge>
        </Group>

        <div>
          <Group gap="xs" align="center">
            <Text size="sm" fw={500}>
              House Address:
            </Text>
            <Text size="sm" c="dimmed">
              {entry.state.houseAddress?.address}
            </Text>
          </Group>
        </div>

        <div>
          {isEditingName ? (
            <>
              <Text size="sm" fw={500} mb={4}>
                Entry Name
              </Text>
              <Group gap="xs" align="flex-end">
                <TextInput
                  size="sm"
                  placeholder="Give your display a name (optional)"
                  value={editedName}
                  maxLength={MAX_ENTRY_NAME_LENGTH}
                  onChange={(e) => setEditedName(e.currentTarget.value)}
                  style={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") cancelNameEdit();
                  }}
                />
                <ActionIcon
                  variant="light"
                  color="green"
                  loading={isSaving}
                  onClick={handleSaveName}
                >
                  <IconCheck size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={cancelNameEdit}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            </>
          ) : (
            <Group gap="xs" align="center">
              <Text size="sm" fw={500}>
                Entry Name:
              </Text>
              <Text size="sm" c="dimmed">
                {entry.state.name || "No name set"}
              </Text>
              <Tooltip label="Edit entry name">
                <ActionIcon
                  variant="light"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                >
                  <IconEdit size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </div>

        <div>
          <PhotoSection photos={photos} canUpload={true} canRemove={true} />
        </div>
      </Stack>
    </Card>
  );
}
