import { Group, Table, Avatar, Text, Stack, Switch } from "@mantine/core";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface UserRowProps {
  user: Doc<"users">;
  onToggleSystemAdmin: (userId: Id<"users">, enabled: boolean) => void;
  onToggleCompetitionAdmin: (userId: Id<"users">, enabled: boolean) => void;
}

function AdminControls({
  user,
  onToggleSystemAdmin,
  onToggleCompetitionAdmin,
}: {
  user: Doc<"users">;
  onToggleSystemAdmin: (userId: Id<"users">, enabled: boolean) => void;
  onToggleCompetitionAdmin: (userId: Id<"users">, enabled: boolean) => void;
}) {
  return (
    <Stack gap="xs">
      <Switch
        label="System Admin"
        checked={user.isSystemAdmin === true}
        onChange={(e) =>
          onToggleSystemAdmin(user._id, e.currentTarget.checked)
        }
        size="xs"
        color="red"
      />
      <Switch
        label="Competition Admin"
        checked={user.isCompetitionAdmin === true}
        onChange={(e) =>
          onToggleCompetitionAdmin(user._id, e.currentTarget.checked)
        }
        size="xs"
        color="green"
      />
    </Stack>
  );
}

export default function UserRow({
  user,
  onToggleSystemAdmin,
  onToggleCompetitionAdmin,
}: UserRowProps) {
  return (
    <Table.Tr>
      <Table.Td>
        <Group gap="sm">
          <Avatar src={user.image} size="sm" radius="xl">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </Avatar>
          <Text size="sm">{user.name ?? "Anonymous User"}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{user.email ?? "-"}</Text>
      </Table.Td>
      <Table.Td>
        <AdminControls
          user={user}
          onToggleSystemAdmin={onToggleSystemAdmin}
          onToggleCompetitionAdmin={onToggleCompetitionAdmin}
        />
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {new Date(user._creationTime).toLocaleDateString()}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

