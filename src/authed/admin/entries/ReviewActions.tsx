import type { ReactNode } from "react";
import { Button, Group, Stack } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useErrorCatchingMutation } from "../../../common/errors";
import RejectEntryModal from "./RejectEntryModal";
import ApproveWarningsModal from "./ApproveWarningsModal";
import type { EntryWarning } from "./checkLines";

// Approve is one tap when nothing's flagged: it's the usual answer and is easy
// to follow up on. With warnings, each has to be ticked off first.
export default function ReviewActions({
  entryId,
  entryName,
  warnings,
  stacked = false,
}: {
  entryId: Id<"entries">;
  entryName: string;
  // The orange lines from the entry's checks
  warnings: EntryWarning[];
  // Approve above Reject, for the narrow column on the review cards
  stacked?: boolean;
}) {
  const [rejectOpened, { open: openReject, close: closeReject }] =
    useDisclosure(false);
  const [approveOpened, { open: openApprove, close: closeApprove }] =
    useDisclosure(false);
  const [approveEntry, isApproving] = useErrorCatchingMutation(
    api.admin.competition.entries.approve,
  );
  const [rejectEntry, isRejecting] = useErrorCatchingMutation(
    api.admin.competition.entries.reject,
  );

  return (
    <>
      <Buttons stacked={stacked}>
        <Button
          leftSection={<IconCheck size={18} />}
          color="green"
          size="md"
          onClick={() =>
            warnings.length > 0 ? openApprove() : approveEntry({ entryId })
          }
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
      </Buttons>

      <ApproveWarningsModal
        opened={approveOpened}
        onClose={closeApprove}
        onConfirm={async () => {
          if (await approveEntry({ entryId })) closeApprove();
        }}
        entryName={entryName}
        warnings={warnings}
        loading={isApproving}
      />

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

// Side by side on an entry's page; Approve above Reject in the review cards'
// narrow column
function Buttons({
  stacked,
  children,
}: {
  stacked: boolean;
  children: ReactNode;
}) {
  return stacked ? (
    <Stack gap="sm">{children}</Stack>
  ) : (
    <Group gap="sm" grow>
      {children}
    </Group>
  );
}
