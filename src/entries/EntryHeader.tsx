import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  IconMap,
  IconMapPin,
  IconNavigation,
  IconShare,
} from "@tabler/icons-react";
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
            {/* Shrinks and breaks anywhere, so a long name can't push the
                card wider than a phone */}
            <Title
              order={1}
              fz={{ base: 26, sm: 32 }}
              lh={1.2}
              miw={0}
              style={{ overflowWrap: "anywhere" }}
            >
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
            <Text c="dimmed">{shortAddress(houseAddress.address)}</Text>
          </Group>
        </Stack>

        {/* On a phone Directions gets a row of its own, as it's what people
            out on the night reach for, and the other two share the next */}
        <Group gap="sm">
          <Button
            component="a"
            // Opens the Maps app on phones, ready to set off
            href={directionsUrl(houseAddress)}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconNavigation size={16} />}
            variant="light"
            size="sm"
            w={{ base: "100%", xs: "auto" }}
          >
            Directions
          </Button>
          <Button
            component="a"
            {...routes.mapEntry({ entryId }).link}
            leftSection={<IconMap size={16} />}
            variant="light"
            size="sm"
            flex={{ base: 1, xs: "initial" }}
          >
            View on map
          </Button>
          <Button
            leftSection={<IconShare size={16} />}
            variant="default"
            size="sm"
            flex={{ base: 1, xs: "initial" }}
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
