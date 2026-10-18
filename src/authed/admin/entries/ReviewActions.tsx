import { Button, Group } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useErrorCatchingMutation } from "../../../common/errors";
import RejectEntryModal from "./RejectEntryModal";

// Approve is one tap: it's the usual answer and is easy to follow up on
export default function ReviewActions({
  entryId,
  entryName,
}: {
  entryId: Id<"entries">;
  entryName: string;
}) {
  const [rejectOpened, { open: openReject, close: closeReject }] =
    useDisclosure(false);
  const [approveEntry, isApproving] = useErrorCatchingMutation(
    api.admin.competition.entries.approve,
  );
  const [rejectEntry, isRejecting] = useErrorCatchingMutation(
    api.admin.competition.entries.reject,
  );

  return (
    <>
      <Group gap="sm" grow>
        <Button
          leftSection={<IconCheck size={18} />}
          color="green"
          size="md"
          onClick={() => approveEntry({ entryId })}
          loading={isApproving}
          disabled={isRejecting}
        >
          Approve
        </Button>
        <Button
          leftSection={<IconX size={18} />}
          color="red"
          variant="outline"
          size="md"
          onClick={openReject}
          disabled={isApproving}
        >
          Reject
        </Button>
      </Group>

      <RejectEntryModal
        opened={rejectOpened}
        onClose={closeReject}
        onConfirm={async (reason) => {
          if (await rejectEntry({ entryId, rejectedReason: reason }))
            closeReject();
        }}
        entryName={entryName}
        loading={isRejecting}
      />
    </>
  );
}
