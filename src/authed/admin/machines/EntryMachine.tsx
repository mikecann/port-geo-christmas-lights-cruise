import { useEffect, useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Code,
  Group,
  Loader,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { routes } from "../../../routes";

const when = (time: number) =>
  new Date(time).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

// "in 4m 10s", or "overdue by 20s"
const untilDue = (dueAt: number, now: number) => {
  const seconds = Math.round(Math.abs(dueAt - now) / 1000);
  const text =
    seconds >= 60
      ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
      : `${seconds}s`;
  return dueAt >= now ? `in ${text}` : `overdue by ${text}`;
};

// Ticks every second, for the time left on a timer
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

// One entry as its machine sees it: its state, its timers, what an admin can
// send it now, and its history
export default function EntryMachine({ entryId }: { entryId: Id<"entries"> }) {
  const detail = useQuery(api.admin.system.machines.entryState, { entryId });
  const now = useNow();

  if (detail === undefined)
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );

  if (detail === null)
    return (
      <Alert color="gray" icon={<IconInfoCircle size={16} />}>
        There's no entry with that ID. It may have been deleted.
      </Alert>
    );

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Text fw={600}>{detail.state.name || "No name yet"}</Text>
        <Badge variant="outline">{detail.year}</Badge>
        <Anchor size="sm" {...routes.adminEntry({ entryId }).link}>
          Open the entry
        </Anchor>
      </Group>

      <Stack gap={4}>
        <Text size="sm" fw={500}>
          State
        </Text>
        <Code block>{JSON.stringify(detail.state, null, 2)}</Code>
      </Stack>

      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Timers
        </Text>
        {detail.stateTimers.length === 0 ? (
          <Text size="sm" c="dimmed">
            None pending.
          </Text>
        ) : (
          detail.stateTimers.map((timer) => (
            <Text size="sm" key={timer.event}>
              <Code>{timer.event}</Code> due {when(timer.dueAt)} (
              {untilDue(timer.dueAt, now)})
            </Text>
          ))
        )}
      </Stack>

      {detail.inspection && (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            What an admin can send now
          </Text>
          {detail.inspection.events.map((step) => (
            <Group key={step.event} gap="xs" wrap="nowrap" align="flex-start">
              <Badge
                variant="light"
                color={
                  step.allowed === true
                    ? "green"
                    : step.allowed === "needs_input"
                      ? "blue"
                      : "gray"
                }
                style={{ flexShrink: 0 }}
              >
                {step.event}
              </Badge>
              <Text size="sm" c={step.allowed === false ? "dimmed" : undefined}>
                {step.allowed === false
                  ? step.reasons.join(" ")
                  : `${step.to ? `to ${step.to}` : "stays put"}${
                      step.allowed === "needs_input"
                        ? ", if its input passes"
                        : ""
                    }`}
              </Text>
            </Group>
          ))}
        </Stack>
      )}

      <Stack gap={4}>
        <Text size="sm" fw={500}>
          History
        </Text>
        <EntryHistory entryId={entryId} />
      </Stack>
    </Stack>
  );
}

function EntryHistory({ entryId }: { entryId: Id<"entries"> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.system.machines.entryHistory,
    { entryId },
    { initialNumItems: 20 },
  );

  if (status === "LoadingFirstPage") return <Loader size="sm" />;

  if (results.length === 0)
    return (
      <Text size="sm" c="dimmed">
        Nothing yet. Entries moved onto the state machine on 20 October 2026, so
        history begins with this entry's first event after that.
      </Text>
    );

  return (
    <Stack gap="xs" align="flex-start">
      <Table.ScrollContainer minWidth={640} w="100%">
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>When</Table.Th>
              <Table.Th>Event</Table.Th>
              <Table.Th>From</Table.Th>
              <Table.Th>To</Table.Th>
              <Table.Th>By</Table.Th>
              <Table.Th>Reasons</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((fact) => (
              <Table.Tr key={`${fact.at}-${fact.event}-${fact.kind}`}>
                <Table.Td style={{ whiteSpace: "nowrap" }}>
                  {when(fact.at)}
                </Table.Td>
                <Table.Td>
                  <Code>{fact.event || fact.kind}</Code>
                  {fact.kind !== "step" && (
                    <Badge ml={6} size="xs" variant="light" color="orange">
                      {fact.kind}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>{fact.from}</Table.Td>
                <Table.Td>{fact.to}</Table.Td>
                <Table.Td>{fact.by}</Table.Td>
                <Table.Td>{fact.reasons.join(" ")}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {status !== "Exhausted" && (
        <Button
          size="xs"
          variant="default"
          loading={status === "LoadingMore"}
          onClick={() => loadMore(20)}
        >
          Show older
        </Button>
      )}
    </Stack>
  );
}
