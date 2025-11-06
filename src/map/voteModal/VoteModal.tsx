import { Modal, Tabs, Title, Group, Text } from "@mantine/core";
import { IconStar, IconSparkles } from "@tabler/icons-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import VoteCategories from "./VoteCategories";
import VoteAuthPrompt from "./VoteAuthPrompt";

type Props = {
  entryId: Id<"entries">;
  opened: boolean;
  onClose: () => void;
};

export default function VoteModal({ entryId, opened, onClose }: Props) {
  const { isAuthenticated } = useConvexAuth();
  const entry = useQuery(api.public.entries.get, { entryId });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="md"
      padding="md"
      centered
      title={`Vote for ${entry?.name} #${entry?.entryNumber}`}
    >
      <div>
        {/* Content */}
        {isAuthenticated ? (
          <VoteCategories entryId={entryId} onClose={onClose} />
        ) : (
          <VoteAuthPrompt onClose={onClose} />
        )}
      </div>
    </Modal>
  );
}
