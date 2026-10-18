import {
  Alert,
  Anchor,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { routes } from "../../../routes";
import { AdminPageHeader } from "../AdminLayout";
import { ENTRY_STATUS_LABELS } from "../entries/entryStatus";
import NumberRangeCard from "./NumberRangeCard";

type NumberRow = FunctionReturnType<
  typeof api.admin.competition.numbers.list
>["numbers"][number];

type State = "used" | "pending" | "kept" | "free";

const STATES: Record<State, { label: string; color: string }> = {
  used: { label: "Used by an approved entry", color: "green" },
  pending: { label: "Held by an entry not approved yet", color: "yellow" },
  kept: { label: "Kept for last year's entrant", color: "blue" },
  free: { label: "Free", color: "gray" },
};

const stateOf = (row: NumberRow): State => {
  if (row.holder) return row.holder.status === "approved" ? "used" : "pending";
  if (row.reservedFor) return "kept";
  return "free";
};

// Something an admin should sort out: a number in use with no sign printed
const needsAttention = (row: NumberRow) =>
  row.isOutsideRange && stateOf(row) !== "free";

// The grid shows every number, so the list starts on the ones in use
const FILTERS = [
  { value: "taken", label: "Taken" },
  { value: "kept", label: "Kept" },
  { value: "free", label: "Free" },
  { value: "attention", label: "Flagged" },
];

const matchesFilter = (row: NumberRow, filter: string) => {
  const state = stateOf(row);
  if (filter === "taken") return state === "used" || state === "pending";
  if (filter === "kept") return state === "kept";
  if (filter === "free") return state === "free";
  return needsAttention(row);
};

export default function NumbersPage() {
  const board = useQuery(api.admin.competition.numbers.list);
  const [filter, setFilter] = useState("taken");

  if (!board)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  const count = (state: State) =>
    board.numbers.filter((row) => stateOf(row) === state).length;
  const flagged = board.numbers.filter(needsAttention);
  const shown = board.numbers.filter((row) => matchesFilter(row, filter));

  return (
    <Stack gap="xl">
      <AdminPageHeader
        title="Numbers"
        description="Every entrant has a number that matches their printed sign and QR code. Numbers stay with the same person every year, so signs can be reused."
      />

      <NumberRangeCard />

      {flagged.length > 0 && (
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title={`${flagged.length} ${flagged.length === 1 ? "number has" : "numbers have"} no printed sign`}
        >
          These are outside the number range, so there's no sign for them. Give
          the entry a number inside the range, or print an extra sign.
        </Alert>
      )}

      {!board.entriesOpen && (
        <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
          Entries are closed, so numbers kept for last year's entrants who
          didn't enter again are now free.
        </Alert>
      )}

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group gap="lg">
            {(Object.keys(STATES) as State[]).map((state) => (
              <Group key={state} gap={6}>
                <Box
                  w={12}
                  h={12}
                  bg={`${STATES[state].color}.6`}
                  style={{ borderRadius: 3 }}
                />
                <Text size="sm">
                  {STATES[state].label} ({count(state)})
                </Text>
              </Group>
            ))}
          </Group>
          <SimpleGrid cols={{ base: 6, xs: 10, md: 15 }} spacing={6}>
            {board.numbers.map((row) => (
              <NumberTile key={row.entryNumber} row={row} />
            ))}
          </SimpleGrid>
        </Stack>
      </Card>

      <Stack gap="sm">
        <SegmentedControl
          data={FILTERS}
          value={filter}
          onChange={setFilter}
          fullWidth
        />
        {shown.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No numbers here.
          </Text>
        ) : filter === "free" ? (
          <Text size="sm">
            {shown.map((row) => row.entryNumber).join(", ")}
          </Text>
        ) : (
          shown.map((row) => <NumberListRow key={row.entryNumber} row={row} />)
        )}
      </Stack>
    </Stack>
  );
}

function NumberTile({ row }: { row: NumberRow }) {
  const state = stateOf(row);
  const color = STATES[state].color;
  const tile = (
    <Paper
      radius="sm"
      py={6}
      ta="center"
      bg={state === "free" ? undefined : `${color}.8`}
      withBorder
      style={
        needsAttention(row)
          ? { outline: "2px solid var(--mantine-color-orange-5)" }
          : undefined
      }
    >
      <Text size="sm" fw={600} c={state === "free" ? "dimmed" : "white"}>
        {row.entryNumber}
      </Text>
    </Paper>
  );
  if (!row.holder) return tile;
  return (
    <UnstyledButton
      component="a"
      {...routes.adminEntry({ entryId: row.holder.entryId }).link}
      aria-label={`Number ${row.entryNumber}: ${row.holder.name}`}
    >
      {tile}
    </UnstyledButton>
  );
}

function NumberListRow({ row }: { row: NumberRow }) {
  const state = stateOf(row);
  return (
    <Paper withBorder radius="md" p="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Badge
          size="lg"
          w={56}
          color={STATES[state].color}
          variant={state === "free" ? "default" : "light"}
          style={{ flexShrink: 0 }}
        >
          #{row.entryNumber}
        </Badge>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {row.holder ? (
            <>
              <Anchor
                {...routes.adminEntry({ entryId: row.holder.entryId }).link}
                fw={500}
              >
                {row.holder.name || "No name yet"}
              </Anchor>
              <Text size="xs" c="dimmed">
                {ENTRY_STATUS_LABELS[row.holder.status]}
              </Text>
            </>
          ) : row.reservedFor ? (
            <>
              <Text fw={500}>
                Kept for {row.reservedFor.name || "last year's entrant"}
              </Text>
              <Text size="xs" c="dimmed">
                Their number in {row.reservedFor.year}. They haven't entered
                again yet.
                {row.reservedFor.email && ` ${row.reservedFor.email}`}
              </Text>
            </>
          ) : null}
          {needsAttention(row) && (
            <Text size="xs" c="orange">
              No printed sign: outside the number range
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}
