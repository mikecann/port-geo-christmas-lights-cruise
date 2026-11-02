import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { event, formatAward } from "../../shared/event";

export default function PrizeList() {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
      {event.prizes.map((prize) => (
        <Paper key={prize.name} withBorder p="md" radius="md">
          <Stack gap="xs">
            <Group
              justify="space-between"
              gap="xs"
              wrap="nowrap"
              align="baseline"
            >
              <Text fw={700} size="lg">
                {prize.name}
              </Text>
              <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                {prize.votedOnSite ? "Public vote" : "Judged"}
              </Text>
            </Group>
            <Text fw={600} c="#FBAF5D">
              {prize.awards.map(formatAward).join(" · ")}
            </Text>
            <Text size="sm" c="dimmed">
              {prize.about}
            </Text>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
