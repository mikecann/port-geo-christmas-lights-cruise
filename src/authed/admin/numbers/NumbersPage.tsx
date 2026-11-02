import {
  Anchor,
  Box,
  Card,
  Center,
  Chip,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { routes } from "../../../routes";
import { InfoTip, PageHeader } from "../../PageHeader";
import EntryStatusBadge from "../../EntryStatusBadge";
import EntryNumberCell from "../entries/EntryNumberCell";
import {
  NUMBER_STATES as STATES,
  collapseRuns,
  needsAttention,
  stateOf,
  type NumberRow,
  type NumberState as State,
} from "./numberState";

type Filter = State | "noSign";

const matchesFilter = (row: NumberRow, filter: Filter) =>
  filter === "noSign" ? needsAttention(row) : stateOf(row) === filter;

// A plain number finds just that number whatever the filter, which is also
// how tapping a tile in the grid works
const asNumber = (search: string) => {
  const text = search.trim().replace(/^#/, "");
  return /^\d+$/.test(text) ? Number(text) : null;
};

const matchesSearch = (row: NumberRow, search: string) => {
  const text = search.trim().toLowerCase();
  if (!text) return true;
  return [row.holder?.name, row.reservedFor?.name, row.reservedFor?.email]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(text));
};

export default function NumbersPage() {
  const board = useQuery(api.admin.competition.numbers.list);
  const [filter, setFilter] = useState<Filter>("inUse");
  const [search, setSearch] = useState("");

  if (!board)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  const searchedNumber = asNumber(search);
  const searched =
    searchedNumber === null
      ? board.numbers.filter((row) => matchesSearch(row, search))
      : board.numbers.filter((row) => row.entryNumber === searchedNumber);
  const countFor = (f: Filter) =>
    board.numbers.filter((row) => matchesFilter(row, f)).length;
  const shown =
    searchedNumber === null
      ? searched.filter((row) => matchesFilter(row, filter))
      : searched;
  const noSignCount = countFor("noSign");
  const filters: Filter[] = [
    "inUse",
    "kept",
    "free",
    // Only worth a chip when there's something to sort out
    ...(noSignCount > 0 ? (["noSign"] as const) : []),
  ];
  // Free numbers have nothing to show but the number, so they're one line
  const showFreeAsLine = searchedNumber === null && filter === "free";

  return (
    <Stack gap="md">
      <PageHeader
        title="Numbers"
        info={
          <Stack gap={6}>
            <Text size="sm">
              Every entrant has a number that matches their printed sign and QR
              code. Numbers stay with the same person every year, so signs can
              be reused.
            </Text>
            {!board.entriesOpen && (
              <Text size="sm">
                Entries are closed, so numbers kept for last year's entrants who
                didn't enter again are now free.
              </Text>
            )}
          </Stack>
        }
        actions={<RangeLink />}
      />

      <Card withBorder radius="md" padding="sm">
        <SimpleGrid cols={{ base: 8, xs: 12, md: 20 }} spacing={4}>
          {board.numbers.map((row) => (
            <NumberTile
              key={row.entryNumber}
              row={row}
              isPicked={searchedNumber === row.entryNumber}
              onPick={() =>
                setSearch(
                  searchedNumber === row.entryNumber
                    ? ""
                    : String(row.entryNumber),
                )
              }
            />
          ))}
        </SimpleGrid>
      </Card>

      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Number, name or email"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          aria-label="Search numbers"
          style={{ flex: "1 1 220px" }}
          maw={320}
        />
        {/* The chips' dots match the grid, so they're the legend too */}
        <Chip.Group
          multiple={false}
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
        >
          <Group gap={6} align="center">
            {filters.map((f) => (
              <Chip key={f} value={f} variant="light" size="sm">
                <Group component="span" gap={6} wrap="nowrap">
                  <Dot color={f === "noSign" ? "orange" : STATES[f].color} />
                  {f === "noSign" ? "No sign" : STATES[f].label}
                  <Text span c="dimmed" size="sm">
                    {countFor(f)}
                  </Text>
                </Group>
              </Chip>
            ))}
            {noSignCount > 0 && (
              <InfoTip size={14}>
                These numbers are in use but outside the number range, so
                there's no printed sign for them. Give the entry a number inside
                the range, or print an extra sign.
              </InfoTip>
            )}
          </Group>
        </Chip.Group>
      </Group>

      {shown.length === 0 ? (
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            No numbers match.
          </Text>
        </Card>
      ) : showFreeAsLine ? (
        <Text size="sm" c="dimmed">
          {collapseRuns(shown.map((row) => row.entryNumber))}
        </Text>
      ) : (
        <Card withBorder radius="md" padding={0}>
          <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={70}>No.</Table.Th>
                <Table.Th>Who has it</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown.map((row) => (
                <NumberTableRow key={row.entryNumber} row={row} />
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <Box
      component="span"
      w={8}
      h={8}
      bg={`${color}.6`}
      display="inline-block"
      style={{ borderRadius: "50%", flexShrink: 0 }}
    />
  );
}

// Light fills, coloured text on a tinted background, so a page of them stays
// calm and the colour still says which is which
function NumberTile({
  row,
  isPicked,
  onPick,
}: {
  row: NumberRow;
  isPicked: boolean;
  onPick: () => void;
}) {
  const state = stateOf(row);
  const color = needsAttention(row) ? "orange" : STATES[state].color;
  const isFree = state === "free";
  const label = row.holder
    ? row.holder.name || "No name yet"
    : row.reservedFor
      ? `Kept for ${row.reservedFor.name || "last year's entrant"}`
      : "Free";
  return (
    <UnstyledButton
      onClick={onPick}
      aria-label={`Number ${row.entryNumber}: ${label}`}
      aria-pressed={isPicked}
      title={label}
      py={2}
      ta="center"
      style={{
        borderRadius: "var(--mantine-radius-sm)",
        background: isFree ? undefined : `var(--mantine-color-${color}-light)`,
        color: isFree
          ? "var(--mantine-color-dimmed)"
          : `var(--mantine-color-${color}-light-color)`,
        outline: isPicked
          ? "2px solid var(--mantine-color-white)"
          : isFree
            ? "1px solid var(--mantine-color-dark-4)"
            : undefined,
        outlineOffset: isPicked ? 1 : -1,
      }}
    >
      <Text size="xs" fw={600} inherit>
        {row.entryNumber}
      </Text>
    </UnstyledButton>
  );
}

function NumberTableRow({ row }: { row: NumberRow }) {
  const { holder, reservedFor } = row;
  const open = holder
    ? () => routes.adminEntry({ entryId: holder.entryId }).push()
    : undefined;
  return (
    <Table.Tr
      // Like the Entries table: the whole row opens the entry, the name is the
      // real link for keyboards and new tabs
      onClick={(event) => {
        if (!open) return;
        if ((event.target as HTMLElement).closest("a")) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        if (window.getSelection()?.toString()) return;
        open();
      }}
      style={{ cursor: open ? "pointer" : undefined }}
    >
      <Table.Td>
        <EntryNumberCell
          entryNumber={row.entryNumber}
          isOutsideRange={needsAttention(row)}
        />
      </Table.Td>
      <Table.Td>
        {holder ? (
          <Anchor
            {...routes.adminEntry({ entryId: holder.entryId }).link}
            c="inherit"
            fw={600}
            underline="hover"
          >
            {holder.name || "No name yet"}
          </Anchor>
        ) : reservedFor ? (
          <>
            <Text size="sm">
              Kept for {reservedFor.name || "last year's entrant"} (
              {reservedFor.year})
            </Text>
            {reservedFor.email && (
              <Text size="xs" c="dimmed" truncate maw={260}>
                {reservedFor.email}
              </Text>
            )}
          </>
        ) : (
          <Text size="sm" c="dimmed">
            Free
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        {holder ? (
          <EntryStatusBadge status={holder.status} labelFrom="sm" />
        ) : reservedFor ? (
          <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            Not entered yet
          </Text>
        ) : null}
      </Table.Td>
    </Table.Tr>
  );
}

// The range is set on Settings with the other competition settings; it's
// shown here because it decides which numbers have a sign
function RangeLink() {
  const range = useQuery(
    api.admin.competition.competitions.getEntryNumberRange,
  );
  if (!range) return null;
  return (
    <Text size="sm" c="dimmed">
      Signs printed for {range.min} to {range.max}.{" "}
      <Anchor {...routes.adminSettings().link}>Change</Anchor>
    </Text>
  );
}
