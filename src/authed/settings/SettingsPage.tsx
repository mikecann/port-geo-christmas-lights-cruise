import {
  Container,
  Title,
  Card,
  Stack,
  Group,
  Text,
  Avatar,
  Divider,
} from "@mantine/core";
import { useMe } from "../../auth/useMeHooks";

export default function SettingsPage() {
  const me = useMe();

  if (!me) return null;

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xl">
        User Settings
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          <Group>
            <Avatar
              src={me.image}
              alt={me.name || "User"}
              size="xl"
              radius="md"
            />
            <div>
              <Text size="lg" fw={500}>
                Profile Information
              </Text>
              <Text size="sm" c="dimmed">
                Your account details from Google
              </Text>
            </div>
          </Group>

          <Divider />

          <Stack gap="md">
            <Group>
              <Text size="sm" fw={500} w={100}>
                Name:
              </Text>
              <Text size="sm">{me.name || "Not provided"}</Text>
            </Group>

            <Group>
              <Text size="sm" fw={500} w={100}>
                Email:
              </Text>
              <Text size="sm">{me.email || "Not provided"}</Text>
            </Group>

            <Group>
              <Text size="sm" fw={500} w={100}>
                Account ID:
              </Text>
              <Text size="sm" c="dimmed" ff="monospace">
                {me._id}
              </Text>
            </Group>

            <Group>
              <Text size="sm" fw={500} w={100}>
                Joined:
              </Text>
              <Text size="sm">
                {new Date(me._creationTime).toLocaleDateString()}
              </Text>
            </Group>
          </Stack>
        </Stack>
      </Card>
    </Container>
  );
}
