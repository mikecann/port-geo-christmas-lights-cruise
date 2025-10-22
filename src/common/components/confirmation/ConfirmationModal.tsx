import { Modal, Stack, Text, Group, Button } from "@mantine/core";
import type { ReactNode } from "react";

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  cancelButton?: ReactNode | string;
  confirmButton?: ReactNode | string;
  onConfirm: () => void;
  confirmLoading?: boolean;
  confirmButtonColor?: string;
  confirmButtonVariant?: string;
}

export default function ConfirmationModal({
  opened,
  onClose,
  title,
  children,
  cancelButton = "Cancel",
  confirmButton = "Confirm",
  onConfirm,
  confirmLoading = false,
  confirmButtonColor = "red",
  confirmButtonVariant = "filled",
}: ConfirmationModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <Stack gap="md">
        {typeof children === "string" ? (
          <Text size="sm">{children}</Text>
        ) : (
          children
        )}
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>
            {cancelButton}
          </Button>
          <Button
            color={confirmButtonColor}
            variant={confirmButtonVariant}
            loading={confirmLoading}
            onClick={onConfirm}
          >
            {confirmButton}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
