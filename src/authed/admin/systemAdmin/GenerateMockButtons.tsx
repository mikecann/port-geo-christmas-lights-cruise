import { Button, Text } from "@mantine/core";
import { IconPlus, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
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
  const [isGeneratingVotes, setIsGeneratingVotes] = useState(false);
  const [generateMockVotes] = useErrorCatchingMutation(
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
                Mock votes will be distributed randomly across approved entries
                in both categories (Best Display and Most Jolly). Each fake user
                will vote once per category.
              </Text>
            </>
          ),
          confirmButton: "Generate Mock Votes",
          confirmButtonColor: "blue",
        });
        if (!confirmed) return;

        setIsGeneratingVotes(true);
        try {
          await generateMockVotes({
            count: voteCount,
          });

          notifications.show({
            title: "Success!",
            message: "Mock votes generated successfully",
            color: "green",
            icon: <IconCheck size={16} />,
          });
        } catch (error) {
          // Error already handled by useErrorCatchingMutation
        } finally {
          setIsGeneratingVotes(false);
        }
      }}
      loading={isGeneratingVotes}
    >
      Generate Mock Votes
    </Button>
  );
}
