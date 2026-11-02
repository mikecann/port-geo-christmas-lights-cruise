import { Stack, Text } from "@mantine/core";
import { routes } from "../../routes";
import { cruiseDateRange, event, formatDate } from "../../../shared/event";
import { FooterLink } from "./FooterLink";

export default function FooterEventInfo() {
  const dates = cruiseDateRange(event.cruise.sailings);
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Event info
      </Text>
      <Stack gap="xs" align="flex-start">
        {dates && (
          <Text c="dimmed" size="sm">
            Cruises {dates} {event.year}
          </Text>
        )}
        {event.entriesClose && (
          <Text c="dimmed" size="sm">
            Entries close {formatDate(event.entriesClose)}
          </Text>
        )}
        <Text c="dimmed" size="sm">
          Busselton, Western Australia
        </Text>
        <FooterLink link={routes.tickets().link}>
          Cruise times and tickets
        </FooterLink>
      </Stack>
    </Stack>
  );
}
