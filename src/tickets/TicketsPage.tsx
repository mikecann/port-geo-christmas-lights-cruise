import { Card, Container, Stack, Text, Title } from "@mantine/core";

export default function TicketsPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>Tickets</Title>
        <Card data-testid="tickets-coming-soon" withBorder radius="md" p="xl">
          <Stack gap="md" align="center">
            <Title order={2} ta="center" size="h3">
              2026 tickets coming soon
            </Title>
            <Text size="lg" c="dimmed" ta="center">
              Cruise dates and ticket details will be announced here once they
              are confirmed.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
