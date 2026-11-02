import {
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconClock, IconMapPin, IconTicket } from "@tabler/icons-react";
import CruiseSchedule from "./CruiseSchedule";
import { event, formatMoney } from "../../shared/event";

export default function TicketsPage() {
  const { cruise } = event;
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>Cruise Tickets</Title>
        <Text size="lg">
          See the lights from the water. The boat goes through all the canals
          and under the bridge. Cruises are run by {cruise.operator}.
        </Text>

        <Card data-testid="tickets" withBorder radius="md" p="xl">
          <Stack gap="md" align="center">
            <Text size="2em" fw={600}>
              {formatMoney(cruise.ticketPrice)} per ticket
            </Text>
            {cruise.ticketsUrl ? (
              <Button
                component="a"
                href={cruise.ticketsUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
                color="#FBAF5D"
                leftSection={<IconTicket size={20} />}
              >
                Book on {cruise.ticketSeller}
              </Button>
            ) : (
              <Text c="dimmed" ta="center">
                Tickets are sold on {cruise.ticketSeller}. The booking link will
                go here as soon as it's up.
              </Text>
            )}
          </Stack>
        </Card>

        {(cruise.departsFrom || cruise.duration) && (
          <Card withBorder radius="md" p="lg">
            <Stack gap="xs">
              {cruise.departsFrom && (
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <IconMapPin
                    size={18}
                    style={{ flexShrink: 0, marginTop: 3 }}
                  />
                  <Text>
                    Boards at {cruise.departsFrom.name}.{" "}
                    <Anchor
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cruise.departsFrom.mapsQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions
                    </Anchor>
                  </Text>
                </Group>
              )}
              {cruise.duration && (
                <Group gap="xs" wrap="nowrap">
                  <IconClock size={18} style={{ flexShrink: 0 }} />
                  <Text>Each cruise takes {cruise.duration}.</Text>
                </Group>
              )}
            </Stack>
          </Card>
        )}
        <Card withBorder radius="md" p="xl">
          <Title order={2} size="h3" mb="md">
            {event.year} cruise times
          </Title>
          <CruiseSchedule />
        </Card>

        <Text c="dimmed">
          On the cruise, scan the QR code on a house's sign, or the one on the
          boat, to vote for your favourite display.
        </Text>
      </Stack>
    </Container>
  );
}
