import {
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { AdminEntryRow } from "../../../../convex/admin/competition/entries";
import { routes } from "../../../routes";
import EntryStatusBadge from "./EntryStatusBadge";

const STATUS_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "submitted", label: "Waiting for review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "unsent", label: "Not sent in yet" },
];

const KIND_FILTERS = [
  { value: "all", label: "New and returning" },
  { value: "returning", label: "Returning entrants" },
  { value: "new", label: "New entrants" },
];

const matchesStatus = (entry: AdminEntryRow, status: string) => {
  if (status === "all") return true;
  if (status === "unsent")
    return entry.status === "draft" || entry.status === "submitting";
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

// Numbered entries first, in number order, then the rest by name
const byNumberThenName = (a: AdminEntryRow, b: AdminEntryRow) =>
  (a.entryNumber ?? Infinity) - (b.entryNumber ?? Infinity) ||
  a.name.localeCompare(b.name);

export default function AllEntries({
  initialStatus,
}: {
  initialStatus?: string;
}) {
  const allEntries = useQuery(api.admin.competition.entries.listAll);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    STATUS_FILTERS.some((filter) => filter.value === initialStatus)
      ? (initialStatus as string)
      : "all",
  );
  const [kind, setKind] = useState("all");

  const shown = (allEntries ?? [])
    .filter((entry) => matchesStatus(entry, status))
    .filter((entry) =>
      kind === "all"
        ? true
        : (entry.previous !== null) === (kind === "returning"),
    )
    .filter((entry) => matchesSearch(entry, search))
    .sort(byNumberThenName);

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Search by name, number, address or email"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        aria-label="Search entries"
      />
      <Group grow gap="sm">
        <Select
          aria-label="Status"
          data={STATUS_FILTERS}
          value={status}
          onChange={(value) => setStatus(value ?? "all")}
          allowDeselect={false}
        />
        <Select
          aria-label="New or returning"
          data={KIND_FILTERS}
          value={kind}
          onChange={(value) => setKind(value ?? "all")}
          allowDeselect={false}
        />
      </Group>

      {allEntries === undefined ? (
        <Center py="lg">
          <Loader />
        </Center>
      ) : shown.length === 0 ? (
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            {allEntries.length === 0
              ? "No one has started an entry yet."
              : "No entries match. Try a different search or filter."}
          </Text>
        </Card>
      ) : (
        <Stack gap={6}>
          <Text size="xs" c="dimmed">
            Showing {shown.length} of {allEntries.length}
          </Text>
          {shown.map((entry) => (
            <EntryRow key={entry._id} entry={entry} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function EntryRow({ entry }: { entry: AdminEntryRow }) {
  return (
    <UnstyledButton
      component="a"
      {...routes.adminEntry({ entryId: entry._id }).link}
    >
      <Paper withBorder radius="md" p="sm">
        <Group gap="sm" wrap="nowrap">
          <Badge
            size="lg"
            variant={entry.entryNumber === undefined ? "default" : "light"}
            color={entry.isNumberOutsideRange ? "orange" : "blue"}
            w={56}
            style={{ flexShrink: 0 }}
          >
            {entry.entryNumber === undefined ? "–" : `#${entry.entryNumber}`}
          </Badge>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} truncate>
              {entry.name || "No name yet"}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {entry.address || "No address yet"}
            </Text>
            <Group gap={6}>
              <EntryStatusBadge status={entry.status} />
              <Badge variant="outline" color="gray">
                {entry.previous
                  ? `Returning, #${entry.previous.entryNumber} in ${entry.previous.year}`
                  : "New"}
              </Badge>
            </Group>
          </Stack>
          <IconChevronRight size={18} color="gray" />
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
