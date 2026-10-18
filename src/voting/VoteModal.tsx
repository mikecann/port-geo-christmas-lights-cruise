import { Modal } from "@mantine/core";
import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import VoteFlow from "./VoteFlow";

type Props = {
  entryId: Id<"entries">;
  opened: boolean;
  onClose: () => void;
};

export default function VoteModal({ entryId, opened, onClose }: Props) {
  const entry = useQuery(api.public.entries.get, { entryId });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="md"
      padding="md"
      centered
      title={entry ? `Vote for ${entry.name} #${entry.entryNumber}` : "Vote"}
    >
      {entry && <VoteFlow entry={entry} />}
    </Modal>
  );
}
