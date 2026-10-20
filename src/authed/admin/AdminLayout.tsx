import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconChartBar,
  IconClipboardList,
  IconGitBranch,
  IconHash,
  IconHome,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import type { Route } from "type-route";
import { api } from "../../../convex/_generated/api";
import { useMe } from "../../auth/useMeHooks";
import { routes, type routeGroups } from "../../routes";

type AdminRoute = Route<typeof routeGroups.admin>;

// The same frame round every admin page: who's allowed in, and the menu
export default function AdminLayout({
  route,
  children,
}: {
  route: AdminRoute;
  children: ReactNode;
}) {
  const me = useMe();
  const isAdmin = Boolean(me?.isSystemAdmin || me?.isCompetitionAdmin);
  const overview = useQuery(
    api.admin.competition.competitions.overview,
    isAdmin ? {} : "skip",
  );

  if (!me) return null;

  if (!isAdmin)
    return (
      <Container size="sm" py="xl">
        <Alert variant="light" color="red" icon={<IconShield size={16} />}>
          You don't have access to the admin area. If you should, ask one of the
          admins to add you on their People page.
        </Alert>
      </Container>
    );

  const items = [
    { name: "admin", label: "Overview", icon: IconHome, link: routes.admin() },
    {
      name: "adminEntries",
      label: "Entries",
      icon: IconClipboardList,
      link: routes.adminEntries(),
      count: overview?.entries.totalSubmittedEntries,
    },
    {
      name: "adminNumbers",
      label: "Numbers",
      icon: IconHash,
      link: routes.adminNumbers(),
    },
    {
      name: "adminVotes",
      label: "Votes",
      icon: IconChartBar,
      link: routes.adminVotes(),
    },
    {
      name: "adminPeople",
      label: "People",
      icon: IconUsers,
      link: routes.adminPeople(),
    },
    ...(me.isSystemAdmin
      ? [
          {
            name: "adminSystem",
            label: "Danger zone",
            icon: IconAlertTriangle,
            link: routes.adminSystem(),
            color: "red",
          },
          {
            name: "adminMachines",
            label: "Machines",
            icon: IconGitBranch,
            link: routes.adminMachines(),
          },
        ]
      : []),
  ];
  // An entry's own page sits under Entries
  const activeName = route.name === "adminEntry" ? "adminEntries" : route.name;
  const isSystemAdminPage =
    route.name === "adminSystem" || route.name === "adminMachines";

  return (
    <Container size="lg" py="md">
      {/* Wraps rather than scrolls, so every page is in sight on a phone */}
      <Group gap={6} mb="lg" component="nav" aria-label="Admin">
        {items.map((item) => {
          const isActive = item.name === activeName;
          return (
            <Button
              key={item.name}
              component="a"
              {...item.link.link}
              variant={isActive ? "filled" : "subtle"}
              color={item.color ?? (isActive ? "blue" : "gray")}
              radius="xl"
              size="sm"
              leftSection={<item.icon size={16} />}
              rightSection={
                item.count ? (
                  <Badge size="sm" circle color="yellow" variant="filled">
                    {item.count}
                  </Badge>
                ) : null
              }
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Button>
          );
        })}
      </Group>

      {isSystemAdminPage && !me.isSystemAdmin ? (
        <Alert variant="light" color="red" icon={<IconShield size={16} />}>
          This page is only for system admins.
        </Alert>
      ) : (
        <Suspense
          fallback={
            <Center py="xl">
              <Loader />
            </Center>
          }
        >
          {children}
        </Suspense>
      )}
    </Container>
  );
}

// Every admin page starts with this, so each says in a line what it's for
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="sm">
      <Stack gap={4} style={{ flex: "1 1 280px" }}>
        <Text component="h1" fz={{ base: 24, sm: 28 }} fw={700} lh={1.2}>
          {title}
        </Text>
        {description && (
          <Text c="dimmed" size="sm" maw={640}>
            {description}
          </Text>
        )}
      </Stack>
      {actions && <Box>{actions}</Box>}
    </Group>
  );
}
