import { Menu, Avatar, Text } from "@mantine/core";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  useMe,
  useIsCompetitionAdmin,
  useIsSystemAdmin,
} from "../../auth/useMeHooks";
import { useApiErrorHandler } from "../errors";
import { routes } from "../../routes";

export function UserAvatarDropdown() {
  const me = useMe();
  const { signOut } = useAuthActions();
  const onApiError = useApiErrorHandler();
  const isSystemAdmin = useIsSystemAdmin();
  const isCompetitionAdmin = useIsCompetitionAdmin();
  const isAdmin = isSystemAdmin || isCompetitionAdmin;

  if (!me) return null;

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Avatar
          src={me.image}
          alt={me.name || "User"}
          radius="xl"
          style={{ cursor: "pointer" }}
        />
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Signed in as</Menu.Label>
        <Menu.Item disabled>
          <Text size="sm" fw={500}>
            {me.name || "Unknown User"}
          </Text>
          {me.email && (
            <Text size="xs" c="dimmed">
              {me.email}
            </Text>
          )}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item component="a" {...routes.myEntries().link}>
          My Entry
        </Menu.Item>
        <Menu.Item component="a" {...routes.myVotes().link}>
          My Votes
        </Menu.Item>
        {isAdmin && (
          <Menu.Item component="a" {...routes.admin().link}>
            Admin
          </Menu.Item>
        )}
        <Menu.Item component="a" {...routes.settings().link}>
          Settings
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item onClick={() => signOut().catch(onApiError)} color="red">
          Sign Out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
