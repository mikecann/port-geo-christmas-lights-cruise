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
    api.admin.system.entries.wipeCurrentCompetition,
  );
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="red"
      leftSection={<IconTrash size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Wipe Current Competition Entries",
          content: (
            <>
              <Text size="sm" mb="md">
                <strong>Warning:</strong> This action will permanently delete
                all entries from the current competition. This action cannot be
                undone.
              </Text>
              <Text size="sm" c="dimmed">
                Archived competition entries are preserved. This removes draft,
                submitted, approved, and rejected entries from the current
                competition only.
              </Text>
            </>
          ),
          confirmButton: "Wipe Current Entries",
          confirmButtonColor: "red",
        });
        if (!confirmed) return;

        setIsWiping(true);
        try {
          await wipeAllEntries({});
          notifications.show({
            title: "Success!",
            message: "Current competition entries wiped successfully",
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
      Wipe Current Entries
    </Button>
  );
}

export function WipeVotesButton() {
  const [isWipingVotes, setIsWipingVotes] = useState(false);
  const [wipeAllVotes] = useErrorCatchingMutation(
    api.admin.system.votes.wipeCurrentCompetition,
  );
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="red"
      leftSection={<IconTrash size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Wipe Current Competition Votes",
          content: (
            <>
              <Text size="sm" mb="md">
                <strong>Warning:</strong> This action will permanently delete
                all votes from the current competition. This action cannot be
                undone.
              </Text>
              <Text size="sm" c="dimmed">
                Archived competition votes are preserved.
              </Text>
            </>
          ),
          confirmButton: "Wipe Current Votes",
          confirmButtonColor: "red",
        });
        if (!confirmed) return;

        setIsWipingVotes(true);
        try {
          await wipeAllVotes({});
          notifications.show({
            title: "Success!",
            message: "Current competition votes wiped successfully",
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
      Wipe Current Votes
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
