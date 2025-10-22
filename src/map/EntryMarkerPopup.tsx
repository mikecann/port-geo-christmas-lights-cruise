import {
  Button,
  Text,
  Stack,
  Title,
  Badge,
  Card,
  Group,
  Loader,
} from "@mantine/core";
import { routes } from "../routes";
import { useIsSystemAdmin } from "../auth/useMeHooks";
import EntryMarkerCarousel from "./EntryMarkerCarousel";
import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface EntryMarkerPopupProps {
  entryId: Id<"entries">;
}

export default function EntryMarkerPopup({ entryId }: EntryMarkerPopupProps) {
  const entry = useQuery(api.public.entries.get, { entryId });

  if (!entry) return <Loader />;

  // Handle the case where houseAddress might be a string or undefined
  if (!entry.houseAddress || typeof entry.houseAddress === "string")
    return null;

  const { lat, lng, address } = entry.houseAddress;

  return (
    <Card padding="0" radius="md" maw={280} bg="white">
      {/* Photo Carousel Section */}
      <Card.Section>
        <EntryMarkerCarousel entry={entry} />
      </Card.Section>

      {/* Entry Details */}
      <Stack gap="xs" mt="sm">
        <Group justify="space-between">
          <Title order={4} size="md" c="dark.8" lh={1.2}>
            {entry.name}
          </Title>
          <Badge variant="light" color="blue" size="sm" w="fit-content">
            #{entry.entryNumber}
          </Badge>
        </Group>

        <Text size="sm" c="gray.6" lh={1.3}>
          {address}
        </Text>

        <Stack gap="xs" mt="xs">
          <Button
            size="sm"
            onClick={() => routes.entry({ entryId: entry._id }).push()}
            fullWidth
          >
            View Details
          </Button>
          <Button
            size="sm"
            color="yellow"
            onClick={() => routes.entryVote({ entryId: entry._id }).push()}
            fullWidth
          >
            Vote
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
