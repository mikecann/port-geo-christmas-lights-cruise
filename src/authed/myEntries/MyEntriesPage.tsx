import {
  Container,
  Title,
  Stack,
  LoadingOverlay,
  Loader,
  Text,
} from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMe } from "../../auth/useMeHooks";
import NoEntryState from "./NoEntryState";
import DraftEntryState from "./DraftEntryState";
import SubmittingEntryState from "./SubmittingEntryState";
import SubmittedEntryState from "./SubmittedEntryState";
import ApprovedEntryState from "./ApprovedEntryState";
import RejectedEntryState from "./RejectedEntryState";
import { exhaustiveCheck, iife } from "../../../shared/misc";

export default function MyEntriesPage() {
  const me = useMe();
  const myEntry = useQuery(api.my.entries.find);

  if (!me) return null;

  const isLoading = myEntry === undefined;

  return (
    <Container size="md" py="xl">
      <LoadingOverlay visible={isLoading} />

      <Title order={1} mb="xl">
        My Entries
      </Title>

      <Stack gap="md">
        {iife(() => {
          if (isLoading) return <Loader />;

          if (!myEntry) return <NoEntryState />;

          if (myEntry.status == "draft")
            return <DraftEntryState entry={myEntry} />;

          if (myEntry.status == "submitting")
            return <SubmittingEntryState entry={myEntry} />;

          if (myEntry.status == "submitted")
            return <SubmittedEntryState entry={myEntry} />;

          if (myEntry.status == "approved")
            return <ApprovedEntryState entry={myEntry} />;

          if (myEntry.status == "rejected")
            return <RejectedEntryState entry={myEntry} />;

          exhaustiveCheck(myEntry);
        })}
      </Stack>
    </Container>
  );
}
