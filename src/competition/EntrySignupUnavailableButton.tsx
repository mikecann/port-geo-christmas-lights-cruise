import { Anchor, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";

interface EntrySignupUnavailableButtonProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: string;
  link?: boolean;
  label?: ReactNode;
}

export default function EntrySignupUnavailableButton({
  size = "md",
  color,
  link = false,
  label = "Enter Competition",
}: EntrySignupUnavailableButtonProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      {link ? (
        <Anchor
          component="button"
          type="button"
          onClick={open}
          c="gray.3"
          size="sm"
          style={{ textAlign: "left" }}
        >
          {label}
        </Anchor>
      ) : (
        <Button onClick={open} size={size} color={color}>
          {label}
        </Button>
      )}
      <Modal
        opened={opened}
        onClose={close}
        title="New entries are not open yet"
        centered
      >
        <Stack gap="lg">
          <Text>
            New entries are currently not available for submission. We will let
            you know once entries open.
          </Text>
          <Group justify="flex-end">
            <Button onClick={close}>Okay</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
