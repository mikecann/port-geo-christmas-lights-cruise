import { Stack, Text, Button, Paper } from "@mantine/core";
import { Authenticated, Unauthenticated } from "convex/react";
import { useQuery } from "convex/react";
import { routes } from "../routes";
import { api } from "../../convex/_generated/api";

export default function CompetitionSignUpSection() {
  return (
    <Paper
      withBorder
      p="xl"
      bg="rgba(251, 175, 93, 0.1)"
      radius="md"
      style={{ maxWidth: "500px" }}
    >
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
      <Unauthenticated>
        <Stack gap="md" align="center">
          <Text size="lg" fw={600} ta="center">
            Want to participate in the competition?
          </Text>
          <Text c="dimmed" ta="center">
            Please sign in first to create your entry
          </Text>
          <Button
            component="a"
            {...routes.signin().link}
            size="lg"
            color="#FBAF5D"
          >
            Sign In
          </Button>
        </Stack>
      </Unauthenticated>
    </Paper>
  );
}

function AuthenticatedContent() {
  const myEntry = useQuery(api.my.entries.find);

  // Show loading state while checking for entry
  if (myEntry === undefined)
    return (
      <Stack gap="md" align="center">
        <Text size="lg" fw={600} ta="center">
          Loading...
        </Text>
      </Stack>
    );

  const hasEntry = myEntry !== null;

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
