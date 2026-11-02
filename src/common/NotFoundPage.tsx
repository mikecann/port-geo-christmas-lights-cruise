import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconChristmasTree, IconMap } from "@tabler/icons-react";
import { routes } from "../routes";

// Most people land here from an old or mistyped link, so point them at the
// two things they were probably after rather than shouting "404"
export function NotFoundPage({
  title = "We couldn't find that page",
  message = "The link might be old or have a typo in it. The displays are all still here, though.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Container size="xs" py={60}>
      <Stack gap="md" ta="center" align="center">
        <Title order={1} fz={26}>
          {title}
        </Title>
        <Text c="dimmed">{message}</Text>
        <Group gap="sm" justify="center" mt="sm">
          <Button
            component="a"
            {...routes.entries().link}
            variant="default"
            leftSection={<IconChristmasTree size={18} />}
          >
            See the displays
          </Button>
          <Button
            component="a"
            {...routes.map().link}
            variant="default"
            leftSection={<IconMap size={18} />}
          >
            Open the map
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
