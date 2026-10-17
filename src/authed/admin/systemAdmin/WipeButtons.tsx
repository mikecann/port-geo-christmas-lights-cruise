import { Button, Text } from "@mantine/core";
import { IconTrash, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";
import { api } from "../../../../convex/_generated/api";

type WipeButtonProps = {
  disabled: boolean;
};

export function WipeEntriesButton({ disabled }: WipeButtonProps) {
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
        } catch {
          // Error already handled by useErrorCatchingMutation
        } finally {
          setIsWiping(false);
        }
      }}
      loading={isWiping}
      disabled={disabled}
    >
      Wipe Current Entries
    </Button>
  );
}

export function WipeVotesButton({ disabled }: WipeButtonProps) {
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
        } catch {
          // Error already handled by useErrorCatchingMutation
        } finally {
          setIsWipingVotes(false);
        }
      }}
      loading={isWipingVotes}
      disabled={disabled}
    >
      Wipe Current Votes
    </Button>
  );
}

export function WipeAllDataButton({ disabled }: WipeButtonProps) {
  const [isWipingAllData, setIsWipingAllData] = useState(false);
  const [wipeAllData] = useErrorCatchingMutation(
    api.admin.system.data.wipeAllData,
  );
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="red"
      leftSection={<IconTrash size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Reset Current Competition",
          content: (
            <>
              <Text size="sm" mb="md">
                <strong>DANGER:</strong> This action will permanently delete
                every entry, photo and vote in the current competition, plus
                users who have nothing left in any competition. This action
                cannot be undone.
              </Text>
              <Text size="sm" c="dimmed">
                Past competitions, the people who took part in them and their
                photos are kept, as are system and competition admins. Use this
                only to reset a dev deployment during testing.
              </Text>
            </>
          ),
          confirmButton: "Reset Current Competition",
          confirmButtonColor: "red",
        });
        if (!confirmed) return;
        setIsWipingAllData(true);
        try {
          await wipeAllData({});
          notifications.show({
            title: "Success!",
            message: "Current competition reset successfully",
            color: "green",
            icon: <IconCheck size={16} />,
          });
        } catch {
          // Error already handled by useErrorCatchingMutation
        } finally {
          setIsWipingAllData(false);
        }
      }}
      loading={isWipingAllData}
      disabled={disabled}
    >
      Reset Current Competition
    </Button>
  );
}
