import { useState } from "react";
import { measured } from "../../analytics/client";
import { Card, Stack, Text, Button } from "@mantine/core";
import { api } from "../../../convex/_generated/api";
import { useApiErrorHandler } from "../../common/errors";
import { useMutation, useQuery } from "convex/react";
import EntrySignupUnavailableButton from "../../competition/EntrySignupUnavailableButton";

export default function NoEntryState() {
  const enterCompetition = useMutation(api.my.entries.enter);
  const [isEntering, setIsEntering] = useState(false);
  const onApiError = useApiErrorHandler();
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
            onClick={() => {
              setIsEntering(true);
              void measured(() => enterCompetition({}), "entry_signup", {
                competition_id: competition?._id,
              })
                .catch(onApiError)
                .finally(() => setIsEntering(false));
            }}
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
