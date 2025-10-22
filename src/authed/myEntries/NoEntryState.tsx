import { Card, Stack, Text, Button } from "@mantine/core";
import { api } from "../../../convex/_generated/api";
import { useErrorCatchingMutation } from "../../common/errors";

export default function NoEntryState() {
  const [enterCompetition, isEntering] = useErrorCatchingMutation(
    api.my.entries.enter,
  );

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md" align="center" py="xl">
        <Text size="lg" fw={500} c="dimmed">
          No entries yet
        </Text>
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          Enter your house in the Christmas lights competition to showcase your
          festive decorations and compete for prizes!
        </Text>
        <Button
          mt="md"
          loading={isEntering}
          onClick={() => enterCompetition({})}
          size="md"
        >
          Enter Competition
        </Button>
      </Stack>
    </Card>
  );
}
