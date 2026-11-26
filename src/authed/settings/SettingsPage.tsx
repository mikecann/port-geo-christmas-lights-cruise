import { useState } from "react";
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { api } from "../../../convex/_generated/api";
import { MAX_USER_NAME_LENGTH } from "../../../shared/constants";
import { useMe } from "../../auth/useMeHooks";
import { useErrorCatchingMutation } from "../../common/errors";
import { PageHeader } from "../PageHeader";

// Who you're signed in as
export default function SettingsPage() {
  const me = useMe();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [updateName, isSaving] = useErrorCatchingMutation(
    api.my.user.updateName,
  );

  if (!me) return null;

  return (
    <Box maw={800}>
      <PageHeader title="Account" />

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          <Group wrap="nowrap" align={isEditing ? "flex-start" : "center"}>
            <Avatar src={me.image} alt={me.name || "You"} size="lg" radius="xl">
              {me.name?.[0]?.toUpperCase()}
            </Avatar>
            <Stack gap={isEditing ? "xs" : 2} style={{ minWidth: 0, flex: 1 }}>
              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = draft.trim();
                    if (!trimmed) return;
                    if (trimmed === (me.name ?? "")) {
                      setIsEditing(false);
                      return;
                    }
                    void updateName({ name: trimmed }).then((ok) => {
                      if (ok) setIsEditing(false);
                    });
                  }}
                >
                  <Stack gap="xs">
                    <TextInput
                      value={draft}
                      onChange={(e) => setDraft(e.currentTarget.value)}
                      placeholder="Your name"
                      aria-label="Your name"
                      maxLength={MAX_USER_NAME_LENGTH}
                      autoFocus
                      disabled={isSaving}
                      maw={360}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setIsEditing(false);
                      }}
                    />
                    <Group gap="xs">
                      <Button
                        type="submit"
                        size="xs"
                        loading={isSaving}
                        disabled={!draft.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="subtle"
                        color="gray"
                        disabled={isSaving}
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </Group>
                  </Stack>
                </form>
              ) : me.name ? (
                <Group gap={6} wrap="nowrap" align="center">
                  <Text size="lg" fw={600} style={{ overflowWrap: "anywhere" }}>
                    {me.name}
                  </Text>
                  <Tooltip label="Edit name">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label="Edit name"
                      onClick={() => {
                        setDraft(me.name ?? "");
                        setIsEditing(true);
                      }}
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ) : (
                <Group gap="xs" wrap="nowrap" align="center">
                  <Text size="lg" fw={600} c="dimmed">
                    No name
                  </Text>
                  <Button
                    size="compact-xs"
                    variant="light"
                    leftSection={<IconPencil size={13} />}
                    onClick={() => {
                      setDraft("");
                      setIsEditing(true);
                    }}
                  >
                    Add name
                  </Button>
                </Group>
              )}
              <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
                {me.email || "No email"}
              </Text>
            </Stack>
          </Group>

          <Divider />

          <Stack gap="xs">
            <Row label="Joined">
              {new Date(me._creationTime).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Row>
            <Row label="Account ID">
              <Text span size="sm" c="dimmed" ff="monospace">
                {me._id}
              </Text>
            </Row>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Group gap="md" wrap="nowrap">
      <Text size="sm" c="dimmed" w={100} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm" style={{ minWidth: 0, wordBreak: "break-all" }}>
        {children}
      </Text>
    </Group>
  );
}
