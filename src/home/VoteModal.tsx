import { Button, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { routes } from "../routes";
import React from "react";

export default function VoteModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} title="How to Vote" centered>
      <Stack>
        <Title order={4}>Vote for an entry</Title>
        <Text>
          You can vote by either going to the entries page and searching for an entry number, or by
          going to the map and selecting an entry from the map to vote.
        </Text>
        <Group justify="flex-end">
          <Button component="a" {...routes.entries().link} variant="outline">
            Go to Entries
          </Button>
          <Button component="a" {...routes.map().link} variant="filled" color="#C52630">
            Open Map
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
