import { Group, Button, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
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
        <WipeEntriesButton />
        <WipeVotesButton />
        <DeleteMyEntryButton />
        <WipeAllDataButton />
      </Group>
    </div>
  );
}
