import { Alert, Anchor, Center, Container, Loader, Stack } from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEntryView } from "../analytics/useEntryView";
import { routes } from "../routes";
import EntryNumberForm from "./EntryNumberForm";
import VoteEntrySummary from "./VoteEntrySummary";
import VoteFlow from "./VoteFlow";

// /v/<number>, where the QR code on each house sign goes
export default function VoteByNumberPage({
  entryNumber,
}: {
  entryNumber: string;
}) {
  const number = /^\d{1,4}$/.test(entryNumber) ? Number(entryNumber) : null;
  const found = useQuery(
    api.public.entries.findByNumberWithPhotos,
    number === null ? "skip" : { entryNumber: number },
  );
  useEntryView(found?.entry._id, found?.entry.competitionId, "entry");

  if (number !== null && found === undefined)
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );

  if (!found)
    return (
      <Container size="xs" py="xl">
        <Stack gap="lg">
          <Alert color="yellow" title={`We couldn't find #${entryNumber}`}>
            There's no display with that number this year. Check the number on
            the sign and try again.
          </Alert>
          <EntryNumberForm />
        </Stack>
      </Container>
    );

  const { entry, photos } = found;
  return (
    <Container size="xs" py="md">
      <Stack gap="lg">
        <VoteEntrySummary entry={entry} photo={photos[0]} />
        <VoteFlow entry={entry} />
        <Anchor ta="center" {...routes.entry({ entryId: entry._id }).link}>
          See more photos and where it is
        </Anchor>
      </Stack>
    </Container>
  );
}
