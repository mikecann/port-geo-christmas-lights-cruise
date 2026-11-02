import { Box, Stack, LoadingOverlay, Loader, Button } from "@mantine/core";
import { PageHeader } from "../PageHeader";
import { IconTrophy } from "@tabler/icons-react";
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
import { routes, useRoute } from "../../routes";
import PreviousEntrySection from "./PreviousEntrySection";

export default function MyEntriesPage() {
  const me = useMe();
  const myEntry = useQuery(api.my.entries.find);
  const previous = useQuery(api.my.entries.findPrevious);
  const route = useRoute();
  const autoStart = route.name === "myEntries" && route.params.start === "1";

  if (!me) return null;

  const isLoading = myEntry === undefined;

  return (
    <Box maw={800} pos="relative">
      <LoadingOverlay visible={isLoading} />

      <PageHeader
        title="My entry"
        actions={
          <Button
            component="a"
            {...routes.competitionDetails().link}
            leftSection={<IconTrophy size={18} />}
            variant="light"
            size="sm"
          >
            Competition details
          </Button>
        }
      />

      <Stack gap="md">
        {iife(() => {
          if (isLoading) return <Loader />;

          if (!myEntry)
            return (
              <NoEntryState
                previous={previous}
                autoStart={autoStart}
                // Drop ?start=1 so a reload or Back doesn't start another
                onAutoStarted={() => routes.myEntries().replace()}
              />
            );

          if (myEntry.state.kind == "draft")
            return <DraftEntryState entry={myEntry} previous={previous} />;

          if (myEntry.state.kind == "submitting")
            return <SubmittingEntryState entry={myEntry} />;

          if (myEntry.state.kind == "submitted")
            return <SubmittedEntryState entry={myEntry} />;

          if (myEntry.state.kind == "approved")
            return <ApprovedEntryState entry={myEntry} />;

          if (myEntry.state.kind == "rejected")
            return <RejectedEntryState entry={myEntry} />;

          exhaustiveCheck(myEntry.state);
        })}
      </Stack>

      <PreviousEntrySection previous={previous} collapsed={!!myEntry} />
    </Box>
  );
}
