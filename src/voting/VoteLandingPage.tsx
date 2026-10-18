import { Container, Stack, Text, Title } from "@mantine/core";
import EntryNumberForm from "./EntryNumberForm";

// Where the QR code on the boat goes
export default function VoteLandingPage() {
  return (
    <Container size="xs" py="xl">
      <Stack gap="lg">
        <Title order={1} ta="center">
          Vote for a display
        </Title>
        <Text ta="center" c="dimmed">
          Every house in the competition has a sign with its number on it.
        </Text>
        <EntryNumberForm />
      </Stack>
    </Container>
  );
}
