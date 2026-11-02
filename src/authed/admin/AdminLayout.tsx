import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import {
  Alert,
  Anchor,
  AppShell,
  Badge,
  Box,
  Burger,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  NavLink,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconChartBar,
  IconClipboardList,
  IconExternalLink,
  IconGitBranch,
  IconHash,
  IconHome,
  IconInfoCircle,
  IconSettings,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Link, Route } from "type-route";
import { api } from "../../../convex/_generated/api";
import { useMe } from "../../auth/useMeHooks";
import { UserAvatarDropdown } from "../../common/layout/UserAvatarDropdown";
import { routes, type routeGroups } from "../../routes";

type AdminRoute = Route<typeof routeGroups.admin>;
type AdminRouteName = AdminRoute["name"];

type NavItem = {
  name: AdminRouteName;
  label: string;
  icon: typeof IconHome;
  link: Link;
  count?: number;
};

// The admin's own frame: a sidebar on a computer, a menu button on a phone.
// It replaces the public header and footer (see Layout), so it's always clear
// you're in the admin, and the public site is one click away.
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
  const [opened, { toggle, close }] = useDisclosure();

  // Picking a page on a phone closes the menu
  useEffect(() => {
    close();
  }, [route.name, close]);

  if (!me) return null;

  if (!isAdmin)
    return (
      <Container size="sm" py="xl">
        <Alert variant="light" color="red" icon={<IconShield size={16} />}>
          You don't have access to the admin area. If you should, ask one of the
          admins to add you on their People page.{" "}
          <Anchor {...routes.home().link}>Back to the site</Anchor>
        </Alert>
      </Container>
    );

  const waiting = overview?.entries.totalSubmittedEntries;
  // An entry's own page sits under Entries
  const activeName: AdminRouteName =
    route.name === "adminEntry" ? "adminEntries" : route.name;
  const isSystemAdminPage =
    route.name === "adminSystem" || route.name === "adminMachines";

  return (
    <AppShell
      header={{ height: { base: 56, sm: 0 } }}
      navbar={{
        width: 240,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
    >
      <AppShell.Header hiddenFrom="sm" bg="dark.8">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              aria-label="Admin menu"
            />
            <Logo width={120} />
          </Group>
          {waiting ? (
            <Anchor {...routes.admin().link} underline="never">
              <Badge color="blue" variant="filled" size="lg" tt="none">
                {waiting} to review
              </Badge>
            </Anchor>
          ) : null}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="dark.8" p="sm">
        <Sidebar
          activeName={activeName}
          isSystemAdmin={Boolean(me.isSystemAdmin)}
          overview={overview}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="lg" py="lg" px={{ base: "md", sm: "xl" }}>
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
      </AppShell.Main>
    </AppShell>
  );
}

type Overview =
  | FunctionReturnType<typeof api.admin.competition.competitions.overview>
  | undefined;

function Sidebar({
  activeName,
  isSystemAdmin,
  overview,
}: {
  activeName: AdminRouteName;
  isSystemAdmin: boolean;
  overview: Overview;
}) {
  const everyday: NavItem[] = [
    {
      name: "admin",
      label: "Home",
      icon: IconHome,
      link: routes.admin().link,
      count: overview?.entries.totalSubmittedEntries,
    },
    {
      name: "adminEntries",
      label: "Entries",
      icon: IconClipboardList,
      link: routes.adminEntries().link,
    },
    {
      name: "adminNumbers",
      label: "Numbers",
      icon: IconHash,
      link: routes.adminNumbers().link,
    },
    {
      name: "adminVotes",
      label: "Votes",
      icon: IconChartBar,
      link: routes.adminVotes().link,
    },
    {
      name: "adminPeople",
      label: "People",
      icon: IconUsers,
      link: routes.adminPeople().link,
    },
  ];
  // Testing tools and debugging, kept small and apart so competition admins
  // never mistake them for everyday pages
  const system: NavItem[] = [
    {
      name: "adminMachines",
      label: "Machines",
      icon: IconGitBranch,
      link: routes.adminMachines().link,
    },
    {
      name: "adminSystem",
      label: "Danger zone",
      icon: IconAlertTriangle,
      link: routes.adminSystem().link,
    },
  ];

  return (
    <Stack h="100%" gap={0}>
      <Box visibleFrom="sm" px={6} pt={4} pb="md">
        <Group gap="xs" align="center" wrap="nowrap">
          <Logo width={140} />
          {overview && (
            <Text fw={600} c="dimmed">
              {overview.year}
            </Text>
          )}
        </Group>
      </Box>

      {overview && (
        <Stack gap={2} px={10} pb="md">
          <Status label="Entries" isOpen={overview.entriesOpen} />
          <Status label="Voting" isOpen={overview.votingOpen} />
        </Stack>
      )}

      <Stack gap={2}>
        {everyday.map((item) => (
          <SidebarLink
            key={item.name}
            item={item}
            isActive={item.name === activeName}
          />
        ))}
        <Divider my="xs" color="dark.5" />
        <SidebarLink
          item={{
            name: "adminSettings",
            label: "Settings",
            icon: IconSettings,
            link: routes.adminSettings().link,
          }}
          isActive={activeName === "adminSettings"}
        />
      </Stack>

      <Box style={{ flex: 1 }} />

      {isSystemAdmin && (
        <Stack gap={0} pb="xs">
          <Group gap={4} px={10} pb={4}>
            <Text size="xs" c="dimmed">
              System admins
            </Text>
            <Tooltip
              label="Only system admins see these. Competition admins never need them."
              multiline
              w={220}
            >
              <IconInfoCircle size={12} color="var(--mantine-color-dimmed)" />
            </Tooltip>
          </Group>
          {system.map((item) => (
            <SidebarLink
              key={item.name}
              item={item}
              isActive={item.name === activeName}
              quiet
            />
          ))}
        </Stack>
      )}

      <Divider color="dark.5" />
      <Group justify="space-between" pt="sm" px={6} wrap="nowrap">
        <UserAvatarDropdown />
        <Anchor {...routes.home().link} size="sm" c="dimmed">
          <Group gap={4} wrap="nowrap">
            View site
            <IconExternalLink size={14} />
          </Group>
        </Anchor>
      </Group>
    </Stack>
  );
}

function SidebarLink({
  item,
  isActive,
  quiet,
}: {
  item: NavItem;
  isActive: boolean;
  quiet?: boolean;
}) {
  return (
    <NavLink
      component="a"
      {...item.link}
      label={item.label}
      leftSection={<item.icon size={quiet ? 16 : 18} stroke={1.6} />}
      rightSection={
        item.count ? (
          <Badge size="sm" circle color="blue" variant="filled">
            {item.count}
          </Badge>
        ) : null
      }
      active={isActive}
      variant="light"
      color="gray"
      c={quiet && !isActive ? "dimmed" : undefined}
      fz={quiet ? "sm" : undefined}
      py={quiet ? 4 : 8}
      style={{ borderRadius: "var(--mantine-radius-md)" }}
      aria-current={isActive ? "page" : undefined}
    />
  );
}

function Status({ label, isOpen }: { label: string; isOpen: boolean }) {
  return (
    <Group gap={8} wrap="nowrap">
      <Box
        w={7}
        h={7}
        bg={isOpen ? "green.6" : "dark.3"}
        style={{ borderRadius: "50%" }}
      />
      <Text size="sm" c="dimmed">
        {label} {isOpen ? "open" : "closed"}
      </Text>
    </Group>
  );
}

function Logo({ width }: { width: number }) {
  return (
    <Anchor {...routes.admin().link} style={{ display: "flex" }}>
      <img
        src="/title-no-year.webp"
        alt="Port Geographe Christmas Lights Cruise admin"
        width={width}
      />
    </Anchor>
  );
}

// Every admin page starts with this. Explanations go behind the ⓘ so the
// pages stay short.
export function AdminPageHeader({
  title,
  info,
  aside,
  actions,
}: {
  title: string;
  info?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="center" mb="lg" gap="sm">
      <Group gap="xs" align="baseline">
        <Text component="h1" fz={{ base: 24, sm: 28 }} fw={700} lh={1.2} m={0}>
          {title}
        </Text>
        {aside && (
          <Text c="dimmed" size="sm">
            {aside}
          </Text>
        )}
        {info && <InfoTip>{info}</InfoTip>}
      </Group>
      {actions && <Box>{actions}</Box>}
    </Group>
  );
}

export function InfoTip({ children }: { children: ReactNode }) {
  return (
    <Tooltip
      label={children}
      multiline
      w={300}
      events={{ hover: true, focus: true, touch: true }}
    >
      <Box
        component="span"
        tabIndex={0}
        style={{ display: "inline-flex", alignSelf: "center", cursor: "help" }}
      >
        <IconInfoCircle size={16} color="var(--mantine-color-dimmed)" />
      </Box>
    </Tooltip>
  );
}
