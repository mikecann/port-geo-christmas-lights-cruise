import { Menu, Text, UnstyledButton } from "@mantine/core";
import { MeAvatar } from "./PhoneMenu";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  useMe,
  useIsCompetitionAdmin,
  useIsSystemAdmin,
} from "../../auth/useMeHooks";
import { useErrorHandler } from "../errors";
import { routes } from "../../routes";

export function UserAvatarDropdown() {
  const me = useMe();
  const { signOut } = useAuthActions();
  const onApiError = useErrorHandler();
  const isSystemAdmin = useIsSystemAdmin();
  const isCompetitionAdmin = useIsCompetitionAdmin();
  const isAdmin = isSystemAdmin || isCompetitionAdmin;

  if (!me) return null;

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <UnstyledButton aria-label="Your account">
          <MeAvatar />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Signed in as</Menu.Label>
        <Text size="sm" fw={500} px="sm" truncate>
          {me.name || "No name"}
        </Text>
        {me.email && (
          <Text size="xs" c="dimmed" px="sm" pb={6} truncate>
            {me.email}
          </Text>
        )}
        <Menu.Divider />
        <Menu.Item component="a" {...routes.myEntries().link}>
          My entry
        </Menu.Item>
        <Menu.Item component="a" {...routes.myVotes().link}>
          My votes
        </Menu.Item>
        {isAdmin && (
          <Menu.Item component="a" {...routes.admin().link}>
            Admin
          </Menu.Item>
        )}
        <Menu.Item component="a" {...routes.settings().link}>
          Account
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item onClick={() => signOut().catch(onApiError)} color="red">
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
