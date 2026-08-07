import {
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { getAddressString } from "../../../shared/misc";
import StatusBadge from "../../common/components/StatusBadge";
import { routes } from "../../routes";

type PreviousEntry = FunctionReturnType<
  typeof api.my.entries.listPrevious
>[number];

interface PreviousEntriesSectionProps {
  entries: PreviousEntry[] | undefined;
}

export default function PreviousEntriesSection({
  entries,
}: PreviousEntriesSectionProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <Stack gap="md" mt="xl">
      <Divider />
      <Title order={2} size="h3">
        Previous years
      </Title>
      {entries.map(({ competition, entry }) => (
        <Card key={entry._id} shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600} size="lg">
                  {competition.year} competition
                </Text>
                <Text c="dimmed">{entry.name || "Unnamed entry"}</Text>
              </div>
              <StatusBadge status={entry.status} />
            </Group>

            {entry.houseAddress && (
              <Text size="sm" c="dimmed">
                {getAddressString(entry.houseAddress)}
              </Text>
            )}

            {entry.status === "approved" && (
              <Group justify="space-between">
                <Text fw={600}>Entry #{entry.entryNumber}</Text>
                <Button
                  component="a"
                  {...routes.entry({ entryId: entry._id }).link}
                  variant="light"
                  size="xs"
                  rightSection={<IconExternalLink size={14} />}
                >
                  View entry
                </Button>
              </Group>
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
