import { Box, Button, Container, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import VoteModal from "./VoteModal";

export default function BookNowSection() {
  const [voteModalOpened, { open: openVoteModal, close: closeVoteModal }] =
    useDisclosure(false);

  return (
    <>
      <Box bg="#02051A" pb={20}>
        <Container size="sm">
          <Stack gap="sm">
            <Button
              size="xl"
              radius="md"
              variant="filled"
              color="#C52630"
              fullWidth
              mt="md"
              styles={{
                root: {
                  height: 80,
                  fontSize: 24,
                  fontWeight: 700,
                },
              }}
              onClick={openVoteModal}
            >
              Vote Now
            </Button>
          </Stack>
        </Container>
      </Box>
      <VoteModal opened={voteModalOpened} onClose={closeVoteModal} />
    </>
  );
}
