import {
  Container,
  Title,
  Stack,
  LoadingOverlay,
  Loader,
  Button,
  Group,
  ActionIcon,
} from "@mantine/core";
import { IconTrophy, IconAlertTriangle } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../../../convex/_generated/api";
import { useMe } from "../../auth/useMeHooks";
import NoEntryState from "./NoEntryState";
import DraftEntryState from "./DraftEntryState";
import SubmittingEntryState from "./SubmittingEntryState";
import SubmittedEntryState from "./SubmittedEntryState";
import ApprovedEntryState from "./ApprovedEntryState";
import RejectedEntryState from "./RejectedEntryState";
import EntryNameGuidelinesModal from "./EntryNameGuidelinesModal";
import { exhaustiveCheck, iife } from "../../../shared/misc";
import { routes } from "../../routes";
import PreviousEntrySection from "./PreviousEntrySection";

export default function MyEntriesPage() {
  const me = useMe();
  const myEntry = useQuery(api.my.entries.find);
  const previous = useQuery(api.my.entries.findPrevious);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  if (!me) return null;

  const isLoading = myEntry === undefined;

  return (
    <Container size="md" py="xl">
      <LoadingOverlay visible={isLoading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>My Entries</Title>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="yellow"
            size="lg"
            onClick={openModal}
          >
            <IconAlertTriangle size={18} />
          </ActionIcon>
          <Button
            component="a"
            {...routes.competitionDetails().link}
            leftSection={<IconTrophy size={18} />}
            variant="light"
            size="sm"
          >
            Competition Details
          </Button>
        </Group>
      </Group>

      <EntryNameGuidelinesModal opened={modalOpened} onClose={closeModal} />

      <Stack gap="md">
        {iife(() => {
          if (isLoading) return <Loader />;

          if (!myEntry) return <NoEntryState previous={previous} />;

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

      <PreviousEntrySection previous={previous} />
    </Container>
  );
}
