import {
  Container,
  Title,
  Stack,
  Alert,
  Card,
  Text,
  Button,
  Group,
  SimpleGrid,
} from "@mantine/core";
import {
  IconShield,
  IconClipboardList,
  IconListCheck,
  IconDatabase,
  IconUsers,
  IconArrowRight,
} from "@tabler/icons-react";
import { useMe } from "../../auth/useMeHooks";
import { routes } from "../../routes";

export default function AdminPage() {
  const me = useMe();

  if (!me) return null;

  const isAdmin = me.isSystemAdmin || me.isCompetitionAdmin;

  if (!isAdmin)
    return (
      <Container size="md" py="xl">
        <Alert variant="light" color="red" icon={<IconShield size={16} />}>
          <Text>
            Access denied. You don't have permission to access the admin panel.
          </Text>
        </Alert>
      </Container>
    );

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="xl">
        Admin Panel
      </Title>

      <Stack gap="xl">
        <Text size="lg" c="dimmed">
          Welcome to the admin panel. Choose from the available administrative
          functions below.
        </Text>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Competition Admin: Entry management */}
          {me.isCompetitionAdmin && (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group>
                  <IconClipboardList
                    size={32}
                    color="var(--mantine-color-green-6)"
                  />
                  <div>
                    <Text size="lg" fw={500}>
                      Entry Management
                    </Text>
                    <Text size="sm" c="dimmed">
                      Review and manage competition entries
                    </Text>
                  </div>
                </Group>

                <Text size="sm">
                  Review submitted entries, approve or reject submissions, and
                  manage the competition workflow.
                </Text>

                <Button
                  rightSection={<IconArrowRight size={16} />}
                  variant="light"
                  color="green"
                  onClick={() => routes.adminEntries().push()}
                >
                  Manage Entries
                </Button>
              </Stack>
            </Card>
          )}

          {/* Vote Management: visible to competition admins and system admins */}
          {(me.isCompetitionAdmin || me.isSystemAdmin) && (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group>
                  <IconListCheck
                    size={32}
                    color="var(--mantine-color-blue-6)"
                  />
                  <div>
                    <Text size="lg" fw={500}>
                      Vote Management
                    </Text>
                    <Text size="sm" c="dimmed">
                      Review public votes by category and voter
                    </Text>
                  </div>
                </Group>

                <Text size="sm">
                  View votes across categories, see which users voted for each
                  entry, and audit voting activity.
                </Text>

                <Button
                  rightSection={<IconArrowRight size={16} />}
                  variant="light"
                  color="blue"
                  onClick={() => routes.adminVotes().push()}
                >
                  Manage Votes
                </Button>
              </Stack>
            </Card>
          )}

          {/* User Management: System Admin only */}
          {me.isSystemAdmin && (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group>
                  <IconUsers size={32} color="var(--mantine-color-purple-6)" />
                  <div>
                    <Text size="lg" fw={500}>
                      User Management
                    </Text>
                    <Text size="sm" c="dimmed">
                      View and manage all system users
                    </Text>
                  </div>
                </Group>

                <Text size="sm">
                  Browse all users in the system, view their roles and account
                  information, and manage user access.
                </Text>

                <Button
                  rightSection={<IconArrowRight size={16} />}
                  variant="light"
                  color="purple"
                  onClick={() => routes.adminUsers().push()}
                >
                  Manage Users
                </Button>
              </Stack>
            </Card>
          )}

          {/* System Admin Card */}
          {me.isSystemAdmin && (
            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{
                gridColumn: me.isCompetitionAdmin ? "1 / -1" : "auto",
              }}
            >
              <Stack gap="md">
                <Group>
                  <IconDatabase size={32} color="var(--mantine-color-red-6)" />
                  <div>
                    <Text size="lg" fw={500}>
                      System Administration
                    </Text>
                    <Text size="sm" c="dimmed">
                      Full system access and database management
                    </Text>
                  </div>
                </Group>

                <Text size="sm">
                  Access the Convex dashboard, manage system settings, and
                  perform administrative tasks.
                </Text>

                <Button
                  rightSection={<IconArrowRight size={16} />}
                  variant="light"
                  color="red"
                  onClick={() => routes.adminSystem().push()}
                >
                  System Administration
                </Button>
              </Stack>
            </Card>
          )}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
