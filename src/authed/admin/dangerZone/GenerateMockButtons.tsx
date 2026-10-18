import { Button, Text } from "@mantine/core";
import { IconPlus, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";
import { api } from "../../../../convex/_generated/api";

interface GenerateMockVotesButtonProps {
  voteCount: number;
}

export function GenerateMockVotesButton({
  voteCount,
}: GenerateMockVotesButtonProps) {
  const [generateMockVotes, isGeneratingVotes] = useErrorCatchingMutation(
    api.admin.system.votes.generateMock,
  );
  const { confirm } = useConfirmation();

  return (
    <Button
      variant="outline"
      color="blue"
      leftSection={<IconPlus size={16} />}
      onClick={async () => {
        const confirmed = await confirm({
          title: "Generate Mock Votes",
          content: (
            <>
              <Text size="sm" mb="md">
                This will create {voteCount} mock votes with random fake users
                for testing and demonstration purposes.
              </Text>
              <Text size="sm" c="dimmed">
                Each fake person votes once for a random approved entry. About
                half count as in person, and one in ten comes from overseas so
                there are flagged votes to look at.
              </Text>
            </>
          ),
          confirmButton: "Generate Mock Votes",
          confirmButtonColor: "blue",
        });
        if (!confirmed) return;

        if (!(await generateMockVotes({ count: voteCount }))) return;
        notifications.show({
          title: "Success!",
          message: "Mock votes generated successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      }}
      loading={isGeneratingVotes}
    >
      Generate Mock Votes
    </Button>
  );
}
