import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Loader,
  NavLink,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconChristmasTree,
  IconHeart,
  IconLayoutDashboard,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMe } from "../../auth/useMeHooks";
import { useErrorHandler } from "../errors";
import { routes, useRoute } from "../../routes";
import { useSiteItems, type MenuItemData as Item } from "./useSiteItems";

// The one menu on a phone: the site's pages, then everything about you
// (or Sign in). On a computer the header shows the pages and your picture
// opens a dropdown instead (MainAppShell, UserAvatarDropdown).
export function PhoneMenu({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size={300}
      padding="sm"
      withCloseButton={false}
      hiddenFrom="sm"
      // Below the 60px header, so its burger turns into the close button
      styles={{
        inner: { top: 60, height: "calc(100% - 60px)" },
        overlay: { top: 60 },
        content: { backgroundColor: "var(--mantine-color-dark-8)" },
        body: { height: "100%" },
      }}
    >
      <PhoneMenuItems />
    </Drawer>
  );
}

function PhoneMenuItems() {
  const me = useMe();
  const route = useRoute();
  const site = useSiteItems();
  const isAdmin = Boolean(me?.isSystemAdmin || me?.isCompetitionAdmin);

  const yours: Item[] = [
    {
      label: "My entry",
      icon: IconChristmasTree,
      link: routes.myEntries().link,
      isActive: route.name === "myEntries",
    },
    {
      label: "My votes",
      icon: IconHeart,
      link: routes.myVotes().link,
      isActive: route.name === "myVotes",
    },
    {
      label: "Account",
      icon: IconUserCircle,
      link: routes.settings().link,
      isActive: route.name === "settings",
    },
  ];
  if (isAdmin)
    yours.push({
      label: "Admin",
      icon: IconLayoutDashboard,
      link: routes.admin().link,
      isActive: false,
    });

  return (
    <Stack h="100%" gap={2}>
      {site.map((item) => (
        <MenuLink key={item.label} item={item} />
      ))}
      <Divider my="sm" color="dark.5" />
      {me ? (
        <>
          <Group gap="sm" wrap="nowrap" px={12} pb="xs">
            <MeAvatar />
            <Box style={{ minWidth: 0 }}>
              <Text fw={600} truncate>
                {me.name || "No name"}
              </Text>
              {me.email && (
                <Text size="sm" c="dimmed" truncate>
                  {me.email}
                </Text>
              )}
            </Box>
          </Group>
          {yours.map((item) => (
            <MenuLink key={item.label} item={item} />
          ))}
          <Box style={{ flex: 1 }} />
          <SignOutLink />
        </>
      ) : (
        <Button
          component="a"
          variant="default"
          size="md"
          mx={4}
          {...routes.signin({
            returnTo: window.location.pathname + window.location.search,
          }).link}
        >
          Sign in
        </Button>
      )}
    </Stack>
  );
}

export function MenuLink({ item }: { item: Item }) {
  return (
    <NavLink
      component="a"
      {...item.link}
      label={item.label}
      leftSection={<item.icon size={20} stroke={1.6} />}
      active={item.isActive}
      variant="light"
      color="gray"
      fz="md"
      py={10}
      style={{ borderRadius: "var(--mantine-radius-md)" }}
      aria-current={item.isActive ? "page" : undefined}
    />
  );
}

export function SignOutLink() {
  const { signOut } = useAuthActions();
  const onApiError = useErrorHandler();
  const [signingOut, setSigningOut] = useState(false);
  return (
    <NavLink
      component="button"
      label="Sign out"
      leftSection={<IconLogout size={20} stroke={1.6} />}
      rightSection={signingOut ? <Loader size="xs" color="red" /> : null}
      disabled={signingOut}
      c="red.5"
      fz="md"
      py={10}
      style={{ borderRadius: "var(--mantine-radius-md)" }}
      onClick={() => {
        setSigningOut(true);
        signOut()
          .then(() => routes.home().push())
          .catch((error: unknown) => {
            setSigningOut(false);
            onApiError(error);
          });
      }}
    />
  );
}

// Your picture, or your initial when there isn't one
export function MeAvatar({ size }: { size?: string }) {
  const me = useMe();
  if (!me) return null;
  return (
    <Avatar src={me.image} alt={me.name || "You"} radius="xl" size={size}>
      {(me.name || me.email || "?")[0]?.toUpperCase()}
    </Avatar>
  );
}
