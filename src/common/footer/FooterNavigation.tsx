import { Stack, Text, Anchor } from "@mantine/core";
import { routes } from "../../routes";

export default function FooterNavigation() {
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Navigation
      </Text>
      <Stack gap="xs">
        <Anchor
          component="a"
          {...routes.home().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          Home
        </Anchor>
        <Anchor
          component="a"
          {...routes.entries().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          View Entries
        </Anchor>
        <Anchor
          component="a"
          {...routes.tickets().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          Book Tickets
        </Anchor>
        <Anchor
          component="a"
          {...routes.map().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          Map View
        </Anchor>
      </Stack>
    </Stack>
  );
}
