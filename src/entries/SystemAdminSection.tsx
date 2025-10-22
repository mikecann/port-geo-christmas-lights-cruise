import { Card, Stack, Text, Button, Group } from "@mantine/core";
import { IconShield, IconTrash } from "@tabler/icons-react";
import { useIsSystemAdmin } from "../auth/useMeHooks";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useErrorCatchingMutation } from "../common/errors";

type Props = {
  entryId: Id<"entries">;
};

export default function SystemAdminSection({ entryId }: Props) {
  const isSystemAdmin = useIsSystemAdmin();
  const [deleteEntry, isDeleting] = useErrorCatchingMutation(
    api.admin.system.entries.deleteById,
  );

  if (!isSystemAdmin) return null;

  return (
    <Card withBorder radius="md">
      <Stack gap="sm">
        <Group>
          <IconShield size={18} color="var(--mantine-color-red-6)" />
          <Text fw={600}>System Admin</Text>
        </Group>
        <Text c="dimmed" size="sm">
          Dangerous actions for this entry.
        </Text>
        <Button
          variant="outline"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() => deleteEntry({ entryId })}
          loading={isDeleting}
        >
          Delete Entry
        </Button>
      </Stack>
    </Card>
  );
}
