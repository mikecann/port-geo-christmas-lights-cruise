import { Anchor, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconMap, IconMapPin, IconShare } from "@tabler/icons-react";
import type { Id } from "../../convex/_generated/dataModel";
import { routes } from "../routes";
import { EntryNumber } from "../common/components/EntryNumber";
import { directionsUrl, shortAddress } from "../common/utils/address";
import { useShareEntry } from "./useShareEntry";

type EntryHeaderProps = {
  entry: {
    name: string;
    entryNumber: number;
    competitionId: string;
    houseAddress: { address: string; lat: number; lng: number };
  };
  entryId: Id<"entries">;
};

export default function EntryHeader({ entry, entryId }: EntryHeaderProps) {
  const { houseAddress } = entry;
  const { share, modal } = useShareEntry(entry, entryId);
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Stack gap={6}>
          <Group gap="sm" align="center" wrap="nowrap">
            <Title order={1} fz={{ base: 26, sm: 32 }} lh={1.2}>
              {entry.name}
            </Title>
            <EntryNumber
              number={entry.entryNumber}
              size="md"
              style={{ flexShrink: 0 }}
            />
          </Group>
          <Group gap={6} wrap="nowrap" align="flex-start">
            <IconMapPin
              size={18}
              color="var(--mantine-color-dimmed)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Text c="dimmed">
              {shortAddress(houseAddress.address)}
              {" · "}
              {/* Opens the Maps app on phones, ready to set off */}
              <Anchor
                href={directionsUrl(houseAddress)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ whiteSpace: "nowrap" }}
              >
                Directions
              </Anchor>
            </Text>
          </Group>
        </Stack>

        <Group gap="sm">
          <Button
            component="a"
            {...routes.mapEntry({ entryId }).link}
            leftSection={<IconMap size={16} />}
            variant="light"
            size="sm"
          >
            View on map
          </Button>
          <Button
            leftSection={<IconShare size={16} />}
            variant="default"
            size="sm"
            onClick={() => void share()}
          >
            Share
          </Button>
        </Group>
      </Stack>
      {modal}
    </Card>
  );
}
