import { Button, Text } from "@mantine/core";
import { IconTrash, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import {
  useErrorCatchingMutation,
  useApiErrorHandler,
} from "../../../common/errors";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function WipeEntriesButton() {
  const [isWiping, setIsWiping] = useState(false);
  const [wipeAllEntries] = useErrorCatchingMutation(
    api.admin.system.entries.wipeAll,
  );
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="red"
      leftSection={<IconTrash size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Wipe All Entries",
          content: (
            <>
              <Text size="sm" mb="md">
                <strong>Warning:</strong> This action will permanently delete
                ALL entries from the database. This action cannot be undone.
              </Text>
              <Text size="sm" c="dimmed">
                This will remove all competition entries including draft,
                submitted, approved, and rejected entries. Use this to reset the
                database for testing purposes.
              </Text>
            </>
          ),
          confirmButton: "Wipe All Entries",
          confirmButtonColor: "red",
        });
        if (!confirmed) return;

        setIsWiping(true);
        try {
          await wipeAllEntries({});
          notifications.show({
            title: "Success!",
            message: "All entries wiped successfully",
            color: "green",
            icon: <IconCheck size={16} />,
          });
        } catch (error) {
          // Error already handled by useErrorCatchingMutation
        } finally {
          setIsWiping(false);
        }
      }}
      loading={isWiping}
    >
      Wipe All Entries
    </Button>
  );
}

export function WipeVotesButton() {
  const [isWipingVotes, setIsWipingVotes] = useState(false);
  const [wipeAllVotes] = useErrorCatchingMutation(
    api.admin.system.votes.wipeAll,
  );
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="red"
      leftSection={<IconTrash size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Wipe All Votes",
          content: (
            <>
              <Text size="sm" mb="md">
                <strong>Warning:</strong> This action will permanently delete
                ALL votes from the database. This action cannot be undone.
              </Text>
              <Text size="sm" c="dimmed">
                Use this to reset public voting.
              </Text>
            </>
          ),
          confirmButton: "Wipe All Votes",
          confirmButtonColor: "red",
        });
        if (!confirmed) return;

        setIsWipingVotes(true);
        try {
          await wipeAllVotes({});
          notifications.show({
            title: "Success!",
            message: "All votes wiped successfully",
            color: "green",
            icon: <IconCheck size={16} />,
          });
        } catch (error) {
          // Error already handled by useErrorCatchingMutation
        } finally {
          setIsWipingVotes(false);
        }
      }}
      loading={isWipingVotes}
    >
      Wipe All Votes
    </Button>
  );
}

export function WipeAllDataButton() {
  const [isWipingAllData, setIsWipingAllData] = useState(false);
  const wipeAllData = useMutation(api.admin.system.data.wipeAllData);
  const onApiError = useApiErrorHandler();
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="red"
      leftSection={<IconTrash size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Wipe All Data",
          content: (
            <>
              <Text size="sm" mb="md">
                <strong>DANGER:</strong> This action will permanently delete ALL
                entries, votes, and users (except system and competition admins)
                from the database. This action cannot be undone.
              </Text>
              <Text size="sm" c="dimmed">
                This will completely reset the competition database, removing
                all entries (draft, submitted, approved, rejected), all public
                votes, and all non-admin users. System and competition admins
                will be preserved. Use this only for complete system resets
                during testing.
              </Text>
            </>
          ),
          confirmButton: "Wipe All Data",
          confirmButtonColor: "red",
        });
        if (!confirmed) return;
        setIsWipingAllData(true);
        await wipeAllData({});
      }}
      loading={isWipingAllData}
    >
      Wipe All Data
    </Button>
  );
}
