import { Card, Container, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function TicketsPage() {
  const competition = useQuery(api.public.competitions.current, {});
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>Tickets</Title>
        <Card data-testid="tickets-coming-soon" withBorder radius="md" p="xl">
          <Stack gap="md" align="center">
            <Title order={2} ta="center" size="h3">
              {competition
                ? `${competition.year} tickets coming soon`
                : "Tickets coming soon"}
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
