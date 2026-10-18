import { Group, Button, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import SendTestEmailButton from "./SendTestEmailButton";
import { GenerateMockVotesButton } from "./GenerateMockButtons";
import {
  WipeEntriesButton,
  WipeVotesButton,
  WipeAllDataButton,
} from "./WipeButtons";
import DeleteMyEntryButton from "./DeleteMyEntryButton";

interface SystemActionsProps {
  voteCount: number;
  onOpenMockEntriesModal: () => void;
}

export default function SystemActions({
  voteCount,
  onOpenMockEntriesModal,
}: SystemActionsProps) {
  const wipesAllowed = useQuery(api.admin.system.data.wipesAllowed, {});
  const wipesDisabled = wipesAllowed !== true;

  return (
    <div>
      <Text size="md" fw={500} mb="md">
        Actions
      </Text>
      <Group>
        <SendTestEmailButton />
        <Button
          variant="outline"
          leftSection={<IconPlus size={16} />}
          onClick={onOpenMockEntriesModal}
        >
          Generate Mock Entries
        </Button>
        <GenerateMockVotesButton voteCount={voteCount} />
        <WipeEntriesButton disabled={wipesDisabled} />
        <WipeVotesButton disabled={wipesDisabled} />
        <DeleteMyEntryButton />
        <WipeAllDataButton disabled={wipesDisabled} />
      </Group>
      {wipesAllowed === false && (
        <Text size="sm" c="dimmed" mt="sm">
          Wipes are turned off on this deployment. Set
          ALLOW_DESTRUCTIVE_WIPES=true on a dev deployment to use them.
        </Text>
      )}
    </div>
  );
}
