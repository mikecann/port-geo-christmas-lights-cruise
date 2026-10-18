import {
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { api } from "../../../../convex/_generated/api";
import type { Person } from "../../../../convex/admin/competition/users";
import { useMe } from "../../../auth/useMeHooks";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";

export default function PersonRow({ person }: { person: Person }) {
  const me = useMe();
  const { confirm } = useConfirmation();
  const [setCompetitionAdmin, isSaving] = useErrorCatchingMutation(
    api.admin.competition.users.setCompetitionAdmin,
  );
  const [setSystemAdmin, isSavingSystem] = useErrorCatchingMutation(
    api.admin.system.users.toggleSystemAdmin,
  );
  const isMe = me?._id === person._id;
  const displayName = person.name || person.email || "This person";
  // System admins can already do everything
  const canToggleAdmin =
    !isMe && (person.isCompetitionAdmin || !person.isSystemAdmin);

  return (
    <Paper withBorder radius="md" p="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Avatar src={person.image} radius="xl">
          {(person.name ?? person.email)?.[0]?.toUpperCase() ?? "?"}
        </Avatar>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6}>
            <Text fw={500}>{person.name || "No name"}</Text>
            {isMe && (
              <Badge size="sm" variant="outline">
                You
              </Badge>
            )}
            {person.isCompetitionAdmin && (
              <Badge size="sm" color="green" variant="light">
                Admin
              </Badge>
            )}
            {person.isSystemAdmin && (
              <Badge size="sm" color="red" variant="light">
                System admin
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
            {person.email ?? "No email"}
          </Text>
          <Text size="xs" c="dimmed">
            Joined {new Date(person._creationTime).toLocaleDateString()}
          </Text>
        </Stack>
      </Group>
      {(canToggleAdmin || me?.isSystemAdmin) && (
        <Group gap="md" mt="sm" ml={50}>
          {canToggleAdmin && (
            <Button
              size="xs"
              variant={person.isCompetitionAdmin ? "default" : "light"}
              color={person.isCompetitionAdmin ? undefined : "green"}
              loading={isSaving}
              onClick={async () => {
                const enabled = !person.isCompetitionAdmin;
                const confirmed = await confirm({
                  title: enabled
                    ? `Make ${displayName} an admin?`
                    : `Remove ${displayName} as an admin?`,
                  content: enabled
                    ? "They'll be able to review entries, see every vote and voter, open and close entries and voting, and add or remove other admins."
                    : "They won't be able to get into the admin area any more. You can make them an admin again later.",
                  confirmButton: enabled ? "Make admin" : "Remove admin",
                  confirmButtonColor: enabled ? "green" : "red",
                });
                if (confirmed)
                  await setCompetitionAdmin({ userId: person._id, enabled });
              }}
            >
              {person.isCompetitionAdmin ? "Remove admin" : "Make admin"}
            </Button>
          )}
          {me?.isSystemAdmin && (
            <Switch
              size="xs"
              color="red"
              label="System admin"
              checked={person.isSystemAdmin}
              disabled={isSavingSystem || isMe}
              onChange={(event) =>
                void setSystemAdmin({
                  userId: person._id,
                  enabled: event.currentTarget.checked,
                })
              }
            />
          )}
        </Group>
      )}
    </Paper>
  );
}
