import { Button, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";
import { api } from "../../../../convex/_generated/api";

export default function DeleteMyEntryButton() {
  const [deleteMyEntry, isDeletingMyEntry] = useErrorCatchingMutation(
    api.admin.system.entries.deleteMine,
  );
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="orange"
      leftSection={<IconTrash size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Delete My Entry",
          content: (
            <>
              <Text size="sm" mb="md">
                <strong>Warning:</strong> This action will permanently delete
                your entry from the database. This action cannot be undone.
              </Text>
              <Text size="sm" c="dimmed">
                This will remove your competition entry regardless of its
                current status (draft, submitted, approved, or rejected). Use
                this for debugging purposes only.
              </Text>
            </>
          ),
          confirmButton: "Delete My Entry",
          confirmButtonColor: "orange",
        });
        if (!confirmed) return;
        deleteMyEntry();
      }}
      loading={isDeletingMyEntry}
    >
      Delete My Entry
    </Button>
  );
}
