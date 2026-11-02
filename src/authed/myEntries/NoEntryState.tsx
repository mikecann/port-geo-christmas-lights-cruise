import { useEffect, useRef, useState } from "react";
import { measured } from "../../analytics/client";
import { Card, Stack, Text, Button } from "@mantine/core";
import { api } from "../../../convex/_generated/api";
import { useErrorHandler } from "../../common/errors";
import { useMutation, useQuery } from "convex/react";
import EntrySignupUnavailableButton from "../../competition/EntrySignupUnavailableButton";
import type { PreviousEntry } from "./PreviousEntrySection";

export default function NoEntryState({
  previous,
  autoStart,
  onAutoStarted,
}: {
  previous: PreviousEntry | null | undefined;
  // Set when they've come from the competition page's Enter button
  autoStart: boolean;
  onAutoStarted: () => void;
}) {
  const enterCompetition = useMutation(api.my.entries.enter);
  const [isEntering, setIsEntering] = useState(false);
  const onApiError = useErrorHandler();
  const competition = useQuery(api.public.competitions.current, {});
  const entriesOpen = competition?.entriesOpen === true;

  const enter = () => {
    setIsEntering(true);
    void measured(() => enterCompetition({}), "entry_signup", {
      competition_id: competition?._id,
    })
      .catch(onApiError)
      .finally(() => setIsEntering(false));
  };

  // They already tapped Enter on the competition page, so don't make them
  // tap it again here. The ref stops a re-render entering twice.
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    // Wait for previous too, so a returning entrant's draft is filled in
    if (!autoStart || !entriesOpen || previous === undefined) return;
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    onAutoStarted();
    enter();
  });

  if (!entriesOpen)
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md" align="center" py="xl">
          <Text size="lg" fw={600}>
            Competition entries are closed
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            Signup details for the next competition will be announced here.
          </Text>
          <EntrySignupUnavailableButton />
        </Stack>
      </Card>
    );

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md" align="center" py="xl">
        <Text size="lg" fw={600}>
          {previous ? "Welcome back!" : "No entries yet"}
        </Text>
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          {previous
            ? `Start this year's entry and we'll fill in your name and address from ${previous.year}.`
            : "Enter your house in the Christmas lights competition to show off your display and be in the running for prizes."}
        </Text>
        <Button mt="md" loading={isEntering} onClick={enter} size="md">
          {/* Last year's numbers are held for the people who had them, so
              it's theirs unless an admin gave it away. The draft says so if
              it was. */}
          {previous
            ? `Enter again as #${previous.entry.entryNumber}`
            : "Enter the competition"}
        </Button>
      </Stack>
    </Card>
  );
}
