import type { ReactNode } from "react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { MachinesViewer } from "@convex-dev/state-machines/viewer";
import "@convex-dev/state-machines/viewer.css";
import { IconSearch } from "@tabler/icons-react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { EntryStateKind } from "../../../../convex/features/entries/schema";
import { useErrorHandler } from "../../../common/errors";
import { routes } from "../../../routes";
import { PageHeader } from "../../PageHeader";
import { ENTRY_STATUS_COLORS } from "../../entryStatus";
import EntryMachine from "./EntryMachine";
import FailedTimers from "./FailedTimers";

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          {help && (
            <Text size="sm" c="dimmed">
              {help}
            </Text>
          )}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

// The state machines viewer, from the library itself: every machine drawn from
// the rules the app runs, with live counts, the entries in each state and one
// entry's history. It reads through convex/admin/system/viewer.ts, which
// answers system admins only, and can't move anything. It routes by the URL's
// hash (#/t/..., #/r/...), so this page stays /admin/machines underneath it.
// The app is dark only, so it starts dark.
function StateMachinesViewer() {
  return (
    <div className="machines-viewer">
      <MachinesViewer
        functions={api.admin.system.viewer}
        config={{
          settings: { theme: "dark" },
          tables: { entries: { name: "Entries" } },
        }}
      />
    </div>
  );
}

// System admins only: the app's state machines working on live data
export default function MachinesPage({ entryId }: { entryId?: string }) {
  const competitionList = useQuery(api.public.competitions.list, {});
  // Unset means the current competition
  const [competitionId, setCompetitionId] = useState<Id<"competitions">>();
  const overview = useQuery(api.admin.system.machines.overview, {
    competitionId,
  });
  const selectedId = competitionId ?? competitionList?.[0]?._id;

  return (
    <Stack gap="xl">
      <PageHeader
        title="Machines"
        info="The app's state machines, drawn from the rules the app runs, and how they're moving entries. Only system admins can see this page."
        actions={
          <Select
            aria-label="Competition year"
            w={100}
            data={(competitionList ?? []).map((c) => ({
              value: c._id,
              label: String(c.year),
            }))}
            value={selectedId ?? null}
            onChange={(value) =>
              setCompetitionId(
                (value ?? undefined) as Id<"competitions"> | undefined,
              )
            }
            allowDeselect={false}
          />
        }
      />

      <StateMachinesViewer />

      <Section
        title="This competition"
        help="How many of this competition's entries are in each state."
      >
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 5 }} spacing="sm">
          {overview?.counts.map(({ kind, count }) => (
            <Card key={kind} withBorder radius="md" padding="sm">
              <Text fz={28} fw={700} lh={1.1}>
                {count}
              </Text>
              <Badge
                variant="light"
                color={ENTRY_STATUS_COLORS[kind as EntryStateKind]}
              >
                {kind}
              </Badge>
            </Card>
          ))}
        </SimpleGrid>
      </Section>

      <Section
        title="One entry"
        help="Look an entry up by the number on its sign to see its state, its timers and its history."
      >
        <LookUpByNumber competitionId={selectedId} />
        {entryId && (
          <EntryMachine key={entryId} entryId={entryId as Id<"entries">} />
        )}
      </Section>

      <Section
        title="Failed timers"
        help="Timers whose step threw. Each stays pending on its entry until it's rearmed, so fix the bug first."
      >
        <FailedTimers />
      </Section>
    </Stack>
  );
}

function LookUpByNumber({
  competitionId,
}: {
  competitionId: Id<"competitions"> | undefined;
}) {
  const convex = useConvex();
  const onApiError = useErrorHandler();
  const [entryNumber, setEntryNumber] = useState<number>();
  const [notFound, setNotFound] = useState<number>();

  const lookUp = async () => {
    if (entryNumber === undefined) return;
    const found = await convex
      .query(api.admin.system.machines.findByNumber, {
        competitionId,
        entryNumber,
      })
      .catch(onApiError);
    if (found === undefined) return;
    setNotFound(found === null ? entryNumber : undefined);
    if (found) routes.adminMachines({ entry: found }).push();
  };

  return (
    <Stack gap={4}>
      <Group
        gap="xs"
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void lookUp();
        }}
      >
        <NumberInput
          aria-label="Entry number"
          placeholder="Entry number"
          w={160}
          min={1}
          allowDecimal={false}
          value={entryNumber ?? ""}
          onChange={(value) =>
            setEntryNumber(typeof value === "number" ? value : undefined)
          }
        />
        <Button
          type="submit"
          variant="default"
          leftSection={<IconSearch size={16} />}
        >
          Look up
        </Button>
      </Group>
      {notFound !== undefined && (
        <Text size="sm" c="dimmed">
          No entry has number {notFound} in this competition.
        </Text>
      )}
    </Stack>
  );
}
