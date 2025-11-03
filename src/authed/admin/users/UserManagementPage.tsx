import {
  Container,
  Title,
  Stack,
  Card,
  Text,
  Group,
  Table,
  ScrollArea,
} from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useMe } from "../../../auth/useMeHooks";
import { Breadcrumbs } from "../../../common/components/Breadcrumbs";
import { routes } from "../../../routes";
import VotesTablePagination from "../votes/VotesTablePagination";
import UserRow from "./UserRow";

const PAGE_SIZE = 100;

export default function UserManagementPage() {
  const me = useMe();
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;

  const total = useQuery(api.admin.system.users.count);
  const users = useQuery(api.admin.system.users.listPage, {
    offset,
    numItems: PAGE_SIZE,
  });

  const toggleSystemAdmin = useMutation(
    api.admin.system.users.toggleSystemAdmin,
  );
  const toggleCompetitionAdmin = useMutation(
    api.admin.system.users.toggleCompetitionAdmin,
  );

  const breadcrumbItems = [
    {
      label: "Admin Panel",
      onClick: () => routes.admin().push(),
    },
    {
      label: "User Management",
      isActive: true,
    },
  ];

  if (!me?.isSystemAdmin)
    return (
      <Container size="md" py="xl">
        <Text c="red">Access denied. System admin permissions required.</Text>
      </Container>
    );

  const isLoading = users === undefined;
  const hasUsers = users && users.length > 0;
  const maxPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="sm">
        User Management
      </Title>

      <Breadcrumbs items={breadcrumbItems} />

      <Stack gap="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group>
              <IconUsers size={32} color="var(--mantine-color-purple-6)" />
              <div>
                <Text size="lg" fw={500}>
                  All Users
                </Text>
                <Text size="sm" c="dimmed">
                  View and manage all system users
                </Text>
              </div>
            </Group>

            <Group justify="space-between">
              <Group gap="sm">
                <Text size="sm" c="dimmed">
                  {total ?? 0} user{(total ?? 0) === 1 ? "" : "s"}
                </Text>
                <Text size="sm" c="dimmed">
                  •
                </Text>
                <Text size="sm" c="dimmed">
                  Showing {Math.min(offset + 1, total ?? 0)}-
                  {Math.min(offset + PAGE_SIZE, total ?? 0)}
                </Text>
              </Group>
            </Group>

            <ScrollArea>
              <Table
                stickyHeader
                highlightOnHover
                striped
                withTableBorder
                withColumnBorders
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Admin Controls</Table.Th>
                    <Table.Th>Created</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isLoading ? (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text size="sm" c="dimmed" ta="center" py="sm">
                          Loading...
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : hasUsers ? (
                    users.map((user) => (
                      <UserRow
                        key={user._id}
                        user={user}
                        onToggleSystemAdmin={(userId, enabled) =>
                          toggleSystemAdmin({ userId, enabled })
                        }
                        onToggleCompetitionAdmin={(userId, enabled) =>
                          toggleCompetitionAdmin({ userId, enabled })
                        }
                      />
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text size="sm" c="dimmed" ta="center" py="sm">
                          No users found.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <VotesTablePagination
              page={page}
              maxPages={maxPages}
              onPageChange={setPage}
            />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
