import { useState } from "react";
import {
  Card,
  Collapse,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";

export type PreviousEntry = NonNullable<
  FunctionReturnType<typeof api.my.entries.findPrevious>
>;

// Read-only: it's a record of what they entered last time. Once this year's
// entry exists it shrinks to one line, so it doesn't compete with it.
export default function PreviousEntrySection({
  previous,
  collapsed,
}: {
  previous: PreviousEntry | null | undefined;
  collapsed: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (!previous) return null;
  const { year, entry } = previous;

  if (!collapsed)
    return (
      <Stack gap="md" mt="xl">
        <Title order={2} size="h4">
          Your {year} entry
        </Title>
        <PreviousEntryCard previous={previous} />
      </Stack>
    );

  return (
    <Stack gap="sm" mt="lg">
      <UnstyledButton
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        maw="100%"
      >
        <Group gap={4} wrap="nowrap">
          {/* Truncated so a long name can't push the page wider than a phone */}
          <Text size="sm" c="dimmed" truncate miw={0}>
            Your {year} entry: {entry.name}, #{entry.entryNumber}
          </Text>
          <IconChevronRight
            size={14}
            color="var(--mantine-color-dimmed)"
            style={{
              transform: isOpen ? "rotate(90deg)" : undefined,
              transition: "transform 150ms ease",
              flexShrink: 0,
            }}
          />
        </Group>
      </UnstyledButton>
      <Collapse expanded={isOpen}>
        <PreviousEntryCard previous={previous} />
      </Collapse>
    </Stack>
  );
}

function PreviousEntryCard({ previous }: { previous: PreviousEntry }) {
  const { year, entry, photos } = previous;
  return (
    <Card padding="lg" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text fw={600} size="lg" miw={0} style={{ overflowWrap: "anywhere" }}>
            {entry.name}
          </Text>
          <Text fz={24} fw={700} lh={1} c="dimmed">
            #{entry.entryNumber}
          </Text>
        </Group>
        <Text size="sm" c="dimmed">
          {entry.address}
        </Text>
        <PhotoGallery photos={photos} showEmptyState={false} />
        <Text size="xs" c="dimmed">
          Kept as a record of {year}, so it can't be changed.
        </Text>
      </Stack>
    </Card>
  );
}
