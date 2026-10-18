import { Card, Text } from "@mantine/core";
import type { Link } from "type-route";

export default function StatTile({
  label,
  value,
  help,
  color,
  link,
}: {
  label: string;
  value: number;
  help?: string;
  color: string;
  link: Link;
}) {
  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      component="a"
      {...link}
      style={{ borderTop: `3px solid var(--mantine-color-${color}-6)` }}
    >
      <Text fz={32} fw={700} lh={1.1}>
        {value}
      </Text>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      {help && (
        <Text size="xs" c="dimmed" mt={2}>
          {help}
        </Text>
      )}
    </Card>
  );
}
