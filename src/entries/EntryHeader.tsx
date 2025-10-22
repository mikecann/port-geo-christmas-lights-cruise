import {
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Title,
  Card,
  Box,
} from "@mantine/core";
import { IconMap, IconMapPin, IconShare } from "@tabler/icons-react";
import type { Id } from "../../convex/_generated/dataModel";
import { routes } from "../routes";
import { getAddressString } from "../../shared/misc";

type EntryHeaderProps = {
  entry: {
    name: string;
    houseAddress:
      | string
      | { address: string; lat: number; lng: number }
      | { address: string; placeId: string }
      | undefined;
    entryNumber: number;
  };
  entryId: Id<"entries">;
  onShareClick: () => void;
};

export default function EntryHeader({
  entry,
  entryId,
  onShareClick,
}: EntryHeaderProps) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        {/* Main entry info */}
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Title order={1} mb="xs">
              {entry.name}
            </Title>
            <Group gap="xs" align="flex-start" mb="md">
              <IconMapPin
                size={18}
                color="var(--mantine-color-gray-6)"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <Text size="lg" c="dimmed">
                {getAddressString(entry.houseAddress)}
              </Text>
            </Group>
          </Box>

          <Badge color="blue" variant="light" size="md">
            #{entry.entryNumber}
          </Badge>
        </Group>

        {/* Actions section */}
        <Group gap="sm">
          <Button
            leftSection={<IconMap size={16} />}
            variant="light"
            size="sm"
            onClick={() => routes.mapEntry({ entryId }).push()}
          >
            View on Map
          </Button>
          <Button
            leftSection={<IconShare size={16} />}
            variant="outline"
            size="sm"
            onClick={onShareClick}
          >
            Share
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
