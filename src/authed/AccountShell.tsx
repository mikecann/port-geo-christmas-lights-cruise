import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import {
  Anchor,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Menu,
  NavLink,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconChartBar,
  IconChristmasTree,
  IconClipboardList,
  IconExternalLink,
  IconGitBranch,
  IconHash,
  IconHeart,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Link, Route } from "type-route";
import { api } from "../../convex/_generated/api";
import { useMe } from "../auth/useMeHooks";
import { useErrorHandler } from "../common/errors";
import { routes, type routeGroups } from "../routes";
import { InfoTip } from "./PageHeader";

type AuthedRoute = Route<typeof routeGroups.authed>;
type AuthedRouteName = AuthedRoute["name"];

type NavItem = {
  name: AuthedRouteName;
  label: string;
  icon: typeof IconUsers;
  link: Link;
  count?: number;
};

type Overview =
  | FunctionReturnType<typeof api.admin.competition.competitions.overview>
  | undefined;

// The frame round every signed-in page: a sidebar on a computer, a menu
// button on a phone. Your own entry, vote and account come first, and admins
// get the admin pages as a section below. It replaces the public header and
// footer (see Layout), and the public site is one click away.
export default function AccountShell({
  route,
  children,
}: {
  route: AuthedRoute;
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

  const waiting = isAdmin ? overview?.entries.totalSubmittedEntries : 0;
  // An entry's own admin page sits under Entries
  const activeName: AuthedRouteName =
    route.name === "adminEntry" ? "adminEntries" : route.name;

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
              aria-label="Menu"
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
          isAdmin={isAdmin}
          isSystemAdmin={Boolean(me.isSystemAdmin)}
          overview={overview}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="lg" py="lg" px={{ base: "md", sm: "xl" }}>
          <Suspense
            fallback={
              <Center py="xl">
                <Loader />
              </Center>
            }
          >
            {children}
          </Suspense>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function Sidebar({
  activeName,
  isAdmin,
  isSystemAdmin,
  overview,
}: {
  activeName: AuthedRouteName;
  isAdmin: boolean;
  isSystemAdmin: boolean;
  overview: Overview;
}) {
  const yours: NavItem[] = [
    {
      name: "myEntries",
      label: "My entry",
      icon: IconChristmasTree,
      link: routes.myEntries().link,
    },
    {
      name: "myVotes",
      label: "My votes",
      icon: IconHeart,
      link: routes.myVotes().link,
    },
    {
      name: "settings",
      label: "Account",
      icon: IconUserCircle,
      link: routes.settings().link,
    },
  ];
  const admin: NavItem[] = [
    {
      name: "admin",
      label: "Overview",
      icon: IconLayoutDashboard,
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
    {
      name: "adminSettings",
      label: "Settings",
      icon: IconSettings,
      link: routes.adminSettings().link,
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
    <Stack h="100%" gap={0} style={{ overflowY: "auto" }}>
      <Box visibleFrom="sm" px={6} pt={4} pb="lg">
        <Logo width={150} />
      </Box>

      <Stack gap={2}>
        {yours.map((item) => (
          <SidebarLink
            key={item.name}
            item={item}
            isActive={item.name === activeName}
          />
        ))}
      </Stack>

      {isAdmin && (
        <>
          <Divider my="sm" color="dark.5" />
          <Group justify="space-between" px={10} pb={4} wrap="nowrap">
            <Text size="xs" fw={600} c="dimmed">
              Admin
            </Text>
            {overview && (
              <Group gap={10} wrap="nowrap">
                <Status label="Entries" isOpen={overview.entriesOpen} />
                <Status label="Voting" isOpen={overview.votingOpen} />
              </Group>
            )}
          </Group>
          <Stack gap={2}>
            {admin.map((item) => (
              <SidebarLink
                key={item.name}
                item={item}
                isActive={item.name === activeName}
              />
            ))}
          </Stack>
        </>
      )}

      <Box style={{ flex: 1 }} mih="md" />

      {isSystemAdmin && (
        <Stack gap={0} pb="xs">
          <Group gap={4} px={10} pb={4}>
            <Text size="xs" c="dimmed">
              System admins
            </Text>
            <InfoTip size={12}>
              Only system admins see these. Competition admins never need them.
            </InfoTip>
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
      <Group justify="space-between" pt="sm" px={6} wrap="nowrap" gap="xs">
        <AccountMenu />
        <Anchor
          {...routes.home().link}
          size="sm"
          c="dimmed"
          style={{ flexShrink: 0 }}
        >
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

// Whether entries or voting are open, as a dot: green when open
function Status({ label, isOpen }: { label: string; isOpen: boolean }) {
  return (
    <Group
      gap={4}
      wrap="nowrap"
      title={`${label} ${isOpen ? "open" : "closed"}`}
      aria-label={`${label} ${isOpen ? "open" : "closed"}`}
      role="img"
    >
      <Box
        w={6}
        h={6}
        bg={isOpen ? "green.6" : "dark.3"}
        style={{ borderRadius: "50%" }}
      />
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

// Who's signed in, with signing out behind it
function AccountMenu() {
  const me = useMe();
  const { signOut } = useAuthActions();
  const onApiError = useErrorHandler();
  if (!me) return null;
  return (
    <Menu shadow="md" width={220} position="top-start">
      <Menu.Target>
        <UnstyledButton style={{ minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Avatar src={me.image} alt={me.name || "You"} radius="xl" size="sm">
              {me.name?.[0]?.toUpperCase()}
            </Avatar>
            <Text size="sm" truncate>
              {me.name?.split(" ")[0] || me.email}
            </Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Signed in as</Menu.Label>
        <Menu.Item disabled>
          <Text size="sm" fw={500}>
            {me.name || "No name"}
          </Text>
          {me.email && (
            <Text size="xs" c="dimmed">
              {me.email}
            </Text>
          )}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={16} />}
          onClick={() =>
            signOut()
              .then(() => routes.home().push())
              .catch(onApiError)
          }
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function Logo({ width }: { width: number }) {
  return (
    <Anchor {...routes.home().link} style={{ display: "flex" }}>
      <img
        src="/title-no-year.webp"
        alt="Port Geographe Christmas Lights Cruise"
        width={width}
      />
    </Anchor>
  );
}
