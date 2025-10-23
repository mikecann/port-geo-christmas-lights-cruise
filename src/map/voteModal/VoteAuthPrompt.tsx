import { Button, Group, Stack, Text } from "@mantine/core";
import { routes } from "../../routes";

export default function VoteAuthPrompt({ onClose }: { onClose: () => void }) {
  return (
    <Stack justify="space-between">
      <Text size="xs" c="dimmed">
        Please sign in to cast your vote for this entry.
      </Text>
      <Group gap="xs">
        <Button
          size="sm"
          onClick={() =>
            routes
              .signin({
                returnTo: window.location.pathname + window.location.search,
              })
              .push()
          }
        >
          Sign in to Vote
        </Button>
      </Group>
    </Stack>
  );
}
