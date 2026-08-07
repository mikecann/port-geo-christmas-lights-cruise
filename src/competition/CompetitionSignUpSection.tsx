import { Stack, Text, Button, Paper } from "@mantine/core";
import { Authenticated, Unauthenticated } from "convex/react";
import { useQuery } from "convex/react";
import { routes } from "../routes";
import { api } from "../../convex/_generated/api";
import EntrySignupUnavailableButton from "./EntrySignupUnavailableButton";

export default function CompetitionSignUpSection() {
  const competition = useQuery(api.public.competitions.current, {});

  return (
    <Paper
      withBorder
      p="xl"
      bg="rgba(251, 175, 93, 0.1)"
      radius="md"
      style={{ maxWidth: "500px" }}
    >
      {competition === undefined ? (
        <LoadingContent />
      ) : (
        <>
          <Authenticated>
            <AuthenticatedContent entriesOpen={competition.entriesOpen} />
          </Authenticated>
          <Unauthenticated>
            {competition.entriesOpen ? (
              <Stack gap="md" align="center">
                <Text size="lg" fw={600} ta="center">
                  Want to participate in the competition?
                </Text>
                <Text c="dimmed" ta="center">
                  Please sign in first to create your entry
                </Text>
                <Button
                  data-testid="competition-sign-in"
                  component="a"
                  {...routes.signin({
                    returnTo: window.location.pathname + window.location.search,
                  }).link}
                  size="lg"
                  color="#FBAF5D"
                >
                  Sign In
                </Button>
              </Stack>
            ) : (
              <ClosedEntriesContent />
            )}
          </Unauthenticated>
        </>
      )}
    </Paper>
  );
}

function AuthenticatedContent({ entriesOpen }: { entriesOpen: boolean }) {
  const myEntry = useQuery(api.my.entries.find);

  if (myEntry === undefined) return <LoadingContent />;

  const hasEntry = myEntry !== null;

  if (!hasEntry && !entriesOpen) return <ClosedEntriesContent />;

  return (
    <Stack gap="md" align="center">
      <Text size="lg" fw={600} ta="center">
        {hasEntry ? "View your competition entry" : "Ready to participate?"}
      </Text>
      <Button
        component="a"
        {...routes.myEntries().link}
        size="lg"
        color="#FBAF5D"
      >
        {hasEntry ? "View My Entry" : "Enter the Competition"}
      </Button>
    </Stack>
  );
}

function LoadingContent() {
  return (
    <Stack gap="md" align="center">
      <Text size="lg" fw={600} ta="center">
        Loading...
      </Text>
    </Stack>
  );
}

function ClosedEntriesContent() {
  return (
    <Stack gap="md" align="center">
      <Text size="lg" fw={600} ta="center">
        Competition entries are currently closed
      </Text>
      <Text c="dimmed" ta="center">
        Entry submissions will open at a later date.
      </Text>
      <EntrySignupUnavailableButton size="lg" color="#FBAF5D" />
    </Stack>
  );
}
