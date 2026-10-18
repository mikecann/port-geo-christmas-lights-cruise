import { Anchor, Stack, Text } from "@mantine/core";
import { routes } from "../../routes";
import { cruiseDateRange, event, formatDate } from "../../../shared/event";

export default function FooterEventInfo() {
  const dates = cruiseDateRange(event.cruise.sailings);
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Event Info
      </Text>
      <Stack gap="xs">
        <Text c="gray.4" size="sm">
          Port Geographe Christmas Lights Cruise
        </Text>
        {dates && (
          <Text c="gray.4" size="sm">
            Cruises {dates} {event.year}
          </Text>
        )}
        {event.entriesClose && (
          <Text c="gray.4" size="sm">
            Entries close {formatDate(event.entriesClose)}
          </Text>
        )}
        <Text c="gray.4" size="sm">
          Busselton, Western Australia
        </Text>
        <Anchor
          component="a"
          {...routes.tickets().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          Cruise times and tickets
        </Anchor>
      </Stack>
    </Stack>
  );
}
