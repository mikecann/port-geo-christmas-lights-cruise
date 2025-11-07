import {
  Container,
  Title,
  Stack,
  LoadingOverlay,
  Loader,
  Text,
  Button,
  Group,
  Modal,
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
import { exhaustiveCheck, iife } from "../../../shared/misc";
import { routes } from "../../routes";

export default function MyEntriesPage() {
  const me = useMe();
  const myEntry = useQuery(api.my.entries.find);
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

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Entry Name Guidelines"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            New this year! Our website now includes an interactive map to help
            voters easily view and locate and their favourite displays to vote.
          </Text>
          <Text size="sm">
            Each entry is shown by its entrant number and entry name only.
          </Text>
          <Text size="sm">
            Please avoid using your full name or home address as your entry name
            - instead, give your display a fun, festive title.
          </Text>
        </Stack>
      </Modal>

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
