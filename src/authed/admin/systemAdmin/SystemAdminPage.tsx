import {
  Container,
  Title,
  Stack,
  Card,
  Text,
  Group,
  Alert,
} from "@mantine/core";
import { IconShield, IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useMe } from "../../../auth/useMeHooks";
import { Breadcrumbs } from "../../../common/components/Breadcrumbs";
import { routes } from "../../../routes";
import DatabaseManagement from "./DatabaseManagement";
import SystemActions from "./SystemActions";
import MockDataModal from "./MockDataModal";

export default function SystemAdminPage() {
  const me = useMe();
  const [mockDataModalOpen, setMockDataModalOpen] = useState(false);
  const [entryCount, setEntryCount] = useState(10);
  const [voteCount] = useState(50);

  if (!me?.isSystemAdmin)
    return (
      <Container size="md" py="xl">
        <Text c="red">Access denied. System admin permissions required.</Text>
      </Container>
    );

  const breadcrumbItems = [
    {
      label: "Admin Panel",
      onClick: () => routes.admin().push(),
    },
    {
      label: "System Administration",
      isActive: true,
    },
  ];

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="sm">
        System Administration
      </Title>

      <Breadcrumbs items={breadcrumbItems} />

      <Stack gap="xl">
        <Alert
          variant="light"
          color="orange"
          icon={<IconInfoCircle size={16} />}
        >
          <Text size="sm">
            <strong>System Administration Access:</strong> You have full
            system-level permissions. Please use these tools carefully as they
            can affect the entire application.
          </Text>
        </Alert>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group>
              <IconShield size={32} color="var(--mantine-color-red-6)" />
              <div>
                <Text size="lg" fw={500}>
                  Full System Access
                </Text>
                <Text size="sm" c="dimmed">
                  Database management and system configuration
                </Text>
              </div>
            </Group>

            <DatabaseManagement />

            <SystemActions
              voteCount={voteCount}
              onOpenMockEntriesModal={() => setMockDataModalOpen(true)}
            />
          </Stack>
        </Card>
      </Stack>

      <MockDataModal
        opened={mockDataModalOpen}
        onClose={() => setMockDataModalOpen(false)}
        entryCount={entryCount}
        setEntryCount={setEntryCount}
      />
    </Container>
  );
}
