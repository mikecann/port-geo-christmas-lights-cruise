import { Avatar, Box, Card, Divider, Group, Stack, Text } from "@mantine/core";
import { useMe } from "../../auth/useMeHooks";
import { PageHeader } from "../PageHeader";

// Who you're signed in as
export default function SettingsPage() {
  const me = useMe();

  if (!me) return null;

  return (
    <Box maw={800}>
      <PageHeader title="Account" />

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          <Group wrap="nowrap">
            <Avatar src={me.image} alt={me.name || "You"} size="lg" radius="xl">
              {me.name?.[0]?.toUpperCase()}
            </Avatar>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="lg" fw={600}>
                {me.name || "No name"}
              </Text>
              <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
                {me.email || "No email"}
              </Text>
            </Stack>
          </Group>

          <Divider />

          <Stack gap="xs">
            <Row label="Joined">
              {new Date(me._creationTime).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Row>
            <Row label="Account ID">
              <Text span size="sm" c="dimmed" ff="monospace">
                {me._id}
              </Text>
            </Row>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Group gap="md" wrap="nowrap">
      <Text size="sm" c="dimmed" w={100} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm" style={{ minWidth: 0, wordBreak: "break-all" }}>
        {children}
      </Text>
    </Group>
  );
}
