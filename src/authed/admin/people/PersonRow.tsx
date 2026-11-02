import { ActionIcon, Anchor, Group, Menu, Table, Text } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { api } from "../../../../convex/_generated/api";
import type { Person } from "../../../../convex/admin/competition/users";
import { useMe } from "../../../auth/useMeHooks";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";
import { routes } from "../../../routes";
import EntryStatusBadge from "../../EntryStatusBadge";

const roleOf = (person: Person) =>
  person.isSystemAdmin
    ? "System admin"
    : person.isCompetitionAdmin
      ? "Admin"
      : "";

export default function PersonRow({ person }: { person: Person }) {
  const me = useMe();
  const { confirm } = useConfirmation();
  const [setCompetitionAdmin, isSaving] = useErrorCatchingMutation(
    api.admin.competition.users.setCompetitionAdmin,
  );
  const [setSystemAdmin, isSavingSystem] = useErrorCatchingMutation(
    api.admin.system.users.toggleSystemAdmin,
  );
  const isMe = me?._id === person._id;
  const displayName = person.name || person.email || "this person";
  // System admins can already do everything
  const canToggleAdmin =
    !isMe && (person.isCompetitionAdmin || !person.isSystemAdmin);
  // Only system admins can make more, and never on themselves
  const canToggleSystem = me?.isSystemAdmin === true && !isMe;
  const role = roleOf(person);

  const toggleAdmin = async () => {
    const enabled = !person.isCompetitionAdmin;
    const confirmed = await confirm({
      title: enabled
        ? `Make ${displayName} an admin?`
        : `Remove ${displayName} as an admin?`,
      content: enabled
        ? "They'll be able to review entries, see every vote and voter, open and close entries and voting, and add or remove other admins."
        : "They won't be able to get into the admin area any more. You can make them an admin again later.",
      confirmButton: enabled ? "Make admin" : "Remove admin",
      confirmButtonColor: enabled ? "green" : "red",
    });
    if (confirmed) await setCompetitionAdmin({ userId: person._id, enabled });
  };

  // This used to be a switch on every row, one tap from giving someone the
  // wipe buttons, so it goes through a confirm like everything else
  const toggleSystemAdmin = async () => {
    const enabled = !person.isSystemAdmin;
    const confirmed = await confirm({
      title: enabled
        ? `Make ${displayName} a system admin?`
        : `Remove ${displayName} as a system admin?`,
      content: enabled
        ? "System admins can do everything, including making test data and wiping the database from the Danger zone. Only give this to developers."
        : person.isCompetitionAdmin
          ? "They'll lose Machines and the Danger zone, and stay an admin."
          : "They'll lose Machines and the Danger zone, and the rest of the admin area too, as they aren't also an admin.",
      confirmButton: enabled ? "Make system admin" : "Remove system admin",
      confirmButtonColor: "red",
    });
    if (confirmed) await setSystemAdmin({ userId: person._id, enabled });
  };

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }}>
          {person.name || person.email || "No name"}
          {isMe && (
            <Text span size="sm" c="dimmed">
              {" "}
              (you)
            </Text>
          )}
        </Text>
        {person.name && person.email && (
          <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
            {person.email}
          </Text>
        )}
        {role && (
          <Text size="xs" c="dimmed" hiddenFrom="sm">
            {role}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        {person.entry ? (
          <Group gap={8} wrap="nowrap">
            <EntryStatusBadge status={person.entry.status} labelFrom="sm" />
            <Anchor
              {...routes.adminEntry({ entryId: person.entry.entryId }).link}
              size="sm"
              c="inherit"
              underline="hover"
              miw={0}
              // A number stays on one line; a draft's name can be long, so it
              // wraps rather than stretch the table past a phone's width
              style={
                person.entry.entryNumber === undefined
                  ? { overflowWrap: "anywhere" }
                  : { whiteSpace: "nowrap" }
              }
            >
              {person.entry.entryNumber === undefined
                ? person.entry.name || "No name yet"
                : `#${person.entry.entryNumber}`}
            </Anchor>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            –
          </Text>
        )}
      </Table.Td>
      <Table.Td visibleFrom="sm">
        <Text size="sm" c={person.voteCount ? undefined : "dimmed"}>
          {person.voteCount || "–"}
        </Text>
      </Table.Td>
      <Table.Td visibleFrom="md">
        <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {new Date(person._creationTime).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </Table.Td>
      <Table.Td visibleFrom="sm">
        <Text size="sm">{role}</Text>
      </Table.Td>
      <Table.Td>
        {(canToggleAdmin || canToggleSystem) && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Actions for ${displayName}`}
                loading={isSaving || isSavingSystem}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {canToggleAdmin && (
                <Menu.Item onClick={() => void toggleAdmin()}>
                  {person.isCompetitionAdmin ? "Remove admin" : "Make admin"}
                </Menu.Item>
              )}
              {canToggleSystem && (
                <Menu.Item onClick={() => void toggleSystemAdmin()}>
                  {person.isSystemAdmin
                    ? "Remove system admin"
                    : "Make system admin"}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
