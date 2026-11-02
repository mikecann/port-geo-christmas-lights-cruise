import { useEntryView } from "../analytics/useEntryView";
import { Anchor, Box, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import { routes } from "../routes";
import EntryMarkerCarousel from "./EntryMarkerCarousel";
import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EntryNumber } from "../common/components/EntryNumber";
import { shortAddress } from "../common/utils/address";

interface EntryMarkerPopupProps {
  entryId: Id<"entries">;
}

// Google draws the white info window around this, so the colours are set for
// a light background even though the app is dark
export default function EntryMarkerPopup({ entryId }: EntryMarkerPopupProps) {
  const entry = useQuery(api.public.entries.get, { entryId });
  const competition = useQuery(api.public.competitions.current, {});

  useEntryView(entry ? entryId : undefined, entry?.competitionId, "map");

  if (!entry) return <Loader size="sm" m="md" />;

  const entryLink = routes.entry({ entryId: entry._id }).link;

  return (
    <Box w={240} maw="70vw">
      <Box style={{ borderRadius: 8, overflow: "hidden" }}>
        <EntryMarkerCarousel entry={entry} />
      </Box>

      <Stack gap={6} pt="sm" px={4} pb={4}>
        <Group gap="xs" wrap="nowrap" justify="space-between" align="center">
          <Anchor {...entryLink} c="dark.8" fw={700} lh={1.25} size="md">
            {entry.name}
          </Anchor>
          <EntryNumber number={entry.entryNumber} />
        </Group>
        <Group gap={4} wrap="nowrap" align="flex-start">
          <IconMapPin
            size={14}
            color="var(--mantine-color-gray-6)"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <Text size="xs" c="gray.7">
            {shortAddress(entry.houseAddress.address)}
          </Text>
        </Group>

        {competition?.votingOpen ? (
          <Button
            data-testid="map-vote-entry"
            component="a"
            {...routes.entryVote({ entryId: entry._id }).link}
            size="sm"
            color="#FBAF5D"
            fullWidth
            mt={4}
          >
            Vote
          </Button>
        ) : (
          <Button
            component="a"
            {...entryLink}
            size="sm"
            variant="outline"
            color="dark"
            fullWidth
            mt={4}
          >
            See the display
          </Button>
        )}
      </Stack>
    </Box>
  );
}
