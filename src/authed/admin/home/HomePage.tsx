import type { ReactNode } from "react";
import {
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconCircleCheck, IconCircleDashed } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { routes } from "../../../routes";
import { PageHeader } from "../../PageHeader";
import ReviewCard from "../entries/ReviewCard";
import { needsAttention } from "../numbers/numberState";
import CompetitionSwitches from "./CompetitionSwitches";

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

const REVIEW_QUEUE_ID = "waiting-for-review";

// Where admins land: what needs doing, whether entries and voting are open,
// then the entries waiting for review, right here rather than a click away
export default function HomePage() {
  const overview = useQuery(api.admin.competition.competitions.overview);
  const waiting = useQuery(api.admin.competition.entries.list, {
    status: "submitted",
  });
  const numbers = useQuery(api.admin.competition.numbers.list);

  // Wait for everything the to-do list needs, so it never says "All done"
  // before it knows
  if (!overview || !waiting || !numbers)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  const { entries, votes } = overview;
  const unsigned = (numbers?.numbers ?? []).filter(needsAttention);
  const totalVotes = votes.inPerson + votes.online + votes.mostJolly;

  const todos: ReactNode[] = [];
  if (waiting && waiting.length > 0)
    todos.push(
      <Todo
        key="review"
        title={`Review ${plural(waiting.length, "entry", "entries")}`}
        detail={waiting.map((entry) => entry.state.name).join(", ")}
        action={
          <Button
            component="a"
            href={`#${REVIEW_QUEUE_ID}`}
            size="xs"
            onClick={(event) => {
              event.preventDefault();
              document
                .getElementById(REVIEW_QUEUE_ID)
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Start
          </Button>
        }
      />,
    );
  if (unsigned.length > 0)
    todos.push(
      <Todo
        key="numbers"
        title={`${plural(unsigned.length, "number has", "numbers have")} no printed sign`}
        detail={unsigned
          .map(
            (row) =>
              `#${row.entryNumber} ${row.holder?.name || row.reservedFor?.name || ""}`,
          )
          .join(", ")}
        action={
          <Button
            component="a"
            {...routes.adminNumbers().link}
            size="xs"
            variant="default"
          >
            Fix
          </Button>
        }
      />,
    );

  return (
    <Stack gap="xl">
      <PageHeader title={`${overview.year} competition`} />

      <Section title="To do">
        {todos.length > 0 ? (
          <Card withBorder radius="md" padding={0}>
            {todos.map((todo, index) => (
              <div key={index}>
                {index > 0 && <Divider />}
                {todo}
              </div>
            ))}
          </Card>
        ) : (
          <Group gap="xs">
            <ThemeIcon color="green" variant="light" radius="xl">
              <IconCircleCheck size={18} />
            </ThemeIcon>
            <Text>All done. New entries will show up here.</Text>
          </Group>
        )}
      </Section>

      <Section title="Right now">
        <CompetitionSwitches
          entriesOpen={overview.entriesOpen}
          votingOpen={overview.votingOpen}
          entriesSummary={`${entries.totalApprovedEntries} approved, ${entries.totalRejectedEntries} rejected, ${entries.totalUnsentEntries} started but not sent in`}
          votingSummary={`${plural(totalVotes, "vote", "votes")} so far: ${votes.inPerson} In-Person Favourites, ${votes.online} People's Choice, ${votes.mostJolly} Most Jolly`}
        />
      </Section>

      {waiting && waiting.length > 0 && (
        <Section title={`Waiting for review (${waiting.length})`}>
          <Stack gap="md" id={REVIEW_QUEUE_ID} style={{ scrollMarginTop: 16 }}>
            {waiting.map((entry) => (
              <ReviewCard key={entry._id} entry={entry} />
            ))}
          </Stack>
        </Section>
      )}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <Text fw={600} size="lg">
        {title}
      </Text>
      {children}
    </Stack>
  );
}

function Todo({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action: ReactNode;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" px="lg" py="md" gap="md">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <IconCircleDashed
          size={20}
          color="var(--mantine-color-dimmed)"
          style={{ flexShrink: 0 }}
        />
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text fw={500}>{title}</Text>
          <Text size="sm" c="dimmed" truncate>
            {detail}
          </Text>
        </Stack>
      </Group>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </Group>
  );
}
