import { Card, Stack, Text, Button } from "@mantine/core";
import { api } from "../../../convex/_generated/api";
import { useErrorCatchingMutation } from "../../common/errors";
import { useQuery } from "convex/react";
import EntrySignupUnavailableButton from "../../competition/EntrySignupUnavailableButton";

export default function NoEntryState() {
  const [enterCompetition, isEntering] = useErrorCatchingMutation(
    api.my.entries.enter,
  );
  const competition = useQuery(api.public.competitions.current, {});
  const entriesOpen = competition?.entriesOpen === true;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md" align="center" py="xl">
        <Text size="lg" fw={500} c="dimmed">
          {entriesOpen ? "No entries yet" : "Competition entries are closed"}
        </Text>
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          {entriesOpen
            ? "Enter your house in the Christmas lights competition to showcase your festive decorations and compete for prizes!"
            : "Signup details for the next competition will be announced here."}
        </Text>
        {entriesOpen ? (
          <Button
            mt="md"
            loading={isEntering}
            onClick={() => enterCompetition({})}
            size="md"
          >
            Enter Competition
          </Button>
        ) : (
          <EntrySignupUnavailableButton />
        )}
      </Stack>
    </Card>
  );
}
