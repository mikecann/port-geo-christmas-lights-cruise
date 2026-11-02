import {
  Anchor,
  Card,
  Center,
  Chip,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconFlag, IconSearch } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { AdminEntryRow } from "../../../../convex/admin/competition/entries";
import { routes } from "../../../routes";
import EntryStatusBadge from "./EntryStatusBadge";

// "All" leaves out entries nobody has sent in yet: they're often abandoned
// drafts and would bury the real entries. They have their own chip.
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "unsent", label: "Not sent in" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

const KIND_FILTERS = [
  { value: "all", label: "New and returning" },
  { value: "returning", label: "Returning entrants" },
  { value: "new", label: "New entrants" },
];

const isUnsent = (entry: AdminEntryRow) =>
  entry.status === "draft" || entry.status === "submitting";

const matchesStatus = (entry: AdminEntryRow, status: StatusFilter) => {
  if (status === "all") return !isUnsent(entry);
  if (status === "unsent") return isUnsent(entry);
  return entry.status === status;
};

const matchesSearch = (entry: AdminEntryRow, search: string) => {
  const text = search.trim().toLowerCase().replace(/^#/, "");
  if (!text) return true;
  return (
    String(entry.entryNumber ?? "") === text ||
    [entry.name, entry.address, entry.submitterName, entry.submitterEmail]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(text))
  );
};

// Waiting entries first, as they need something doing, then numbered entries
// in number order, then the rest by name
const sortRank = (entry: AdminEntryRow) =>
  entry.status === "submitted" ? 0 : 1;
const byWaitingThenNumber = (a: AdminEntryRow, b: AdminEntryRow) =>
  sortRank(a) - sortRank(b) ||
  (a.entryNumber ?? Infinity) - (b.entryNumber ?? Infinity) ||
  a.name.localeCompare(b.name);

const isStatusFilter = (value: string | undefined): value is StatusFilter =>
  STATUS_FILTERS.some((filter) => filter.value === value);

export default function AllEntries({
  initialStatus,
}: {
  initialStatus?: string;
}) {
  const allEntries = useQuery(api.admin.competition.entries.listAll);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>(
    isStatusFilter(initialStatus) ? initialStatus : "all",
  );
  const [kind, setKind] = useState("all");

  if (allEntries === undefined)
    return (
      <Center py="lg">
        <Loader />
      </Center>
    );

  const byKind = allEntries.filter((entry) =>
    kind === "all"
      ? true
      : (entry.previous !== null) === (kind === "returning"),
  );
  const searched = byKind.filter((entry) => matchesSearch(entry, search));
  const countFor = (filter: StatusFilter) =>
    searched.filter((entry) => matchesStatus(entry, filter)).length;
  const shown = searched
    .filter((entry) => matchesStatus(entry, status))
    .sort(byWaitingThenNumber);
  const hiddenUnsent = status === "all" ? countFor("unsent") : 0;

  return (
    <Stack gap="sm">
      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Name, number, address or email"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          aria-label="Search entries"
          style={{ flex: "1 1 240px" }}
          maw={360}
        />
        <Chip.Group
          multiple={false}
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
        >
          <Group gap={6}>
            {STATUS_FILTERS.map((filter) => (
              <Chip
                key={filter.value}
                value={filter.value}
                variant="light"
                size="sm"
              >
                {filter.label}{" "}
                <Text span c="dimmed" size="sm">
                  {countFor(filter.value)}
                </Text>
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <Select
          aria-label="New or returning"
          data={KIND_FILTERS}
          value={kind}
          onChange={(value) => setKind(value ?? "all")}
          allowDeselect={false}
          w={190}
          ml={{ md: "auto" }}
        />
      </Group>

      {shown.length === 0 ? (
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            {allEntries.length === 0
              ? "No one has started an entry yet."
              : "No entries match. Try a different search or filter."}
          </Text>
        </Card>
      ) : (
        <Card withBorder radius="md" padding={0}>
          <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={70}>No.</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th visibleFrom="md">Address</Table.Th>
                <Table.Th visibleFrom="lg">Entrant</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th visibleFrom="sm">Before</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown.map((entry) => (
                <EntryRow key={entry._id} entry={entry} />
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
      {hiddenUnsent > 0 && (
        <Text size="xs" c="dimmed">
          {hiddenUnsent} not sent in yet{" "}
          {hiddenUnsent === 1 ? "isn't" : "aren't"} shown in All.{" "}
          <Anchor size="xs" onClick={() => setStatus("unsent")}>
            Show them
          </Anchor>
        </Text>
      )}
    </Stack>
  );
}

function EntryRow({ entry }: { entry: AdminEntryRow }) {
  const link = routes.adminEntry({ entryId: entry._id }).link;
  return (
    <Table.Tr
      // The whole row opens the entry; the name is the real link, for
      // keyboards and opening in a new tab
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) return;
        routes.adminEntry({ entryId: entry._id }).push();
      }}
      style={{ cursor: "pointer" }}
    >
      <Table.Td>
        {entry.entryNumber === undefined ? (
          <Text c="dimmed">–</Text>
        ) : entry.isNumberOutsideRange ? (
          <Tooltip label="No printed sign: this number is outside the number range">
            <Group gap={4} wrap="nowrap">
              <Text c="orange.5" fw={500}>
                #{entry.entryNumber}
              </Text>
              <IconFlag size={14} color="var(--mantine-color-orange-5)" />
            </Group>
          </Tooltip>
        ) : (
          <Text>#{entry.entryNumber}</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Anchor
          {...link}
          c="inherit"
          fw={600}
          underline="hover"
          style={{ whiteSpace: "nowrap" }}
        >
          {entry.name || "No name yet"}
        </Anchor>
        <Text size="xs" c="dimmed" hiddenFrom="md" truncate maw={220}>
          {entry.address || "No address yet"}
        </Text>
      </Table.Td>
      <Table.Td visibleFrom="md">
        <Text size="sm" c={entry.address ? undefined : "dimmed"}>
          {entry.address || "No address yet"}
        </Text>
      </Table.Td>
      <Table.Td visibleFrom="lg">
        <Text size="sm">{entry.submitterName || entry.submitterEmail}</Text>
      </Table.Td>
      <Table.Td>
        <EntryStatusBadge status={entry.status} labelFrom="sm" />
      </Table.Td>
      <Table.Td visibleFrom="sm">
        <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
          {entry.previous
            ? `${entry.previous.entryNumber === undefined ? "Entered" : `#${entry.previous.entryNumber}`} in ${entry.previous.year}`
            : ""}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}
