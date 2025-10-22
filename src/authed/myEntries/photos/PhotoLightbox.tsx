import { Modal, Image, Center, Box, ActionIcon } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

interface PhotoLightboxProps {
  opened: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export default function PhotoLightbox({
  opened,
  onClose,
  imageUrl,
}: PhotoLightboxProps) {
  if (!imageUrl) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="auto"
      centered
      padding={0}
      withCloseButton={false}
      overlayProps={{
        backgroundOpacity: 0.9,
        blur: 3,
      }}
      styles={{
        content: {
          background: "transparent",
        },
        body: {
          padding: 0,
        },
      }}
    >
      <Center>
        <Box
          pos="relative"
          style={{
            border: "2px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Image
            src={imageUrl}
            alt="Full size entry photo"
            style={{
              maxWidth: "calc(95vw - 50px)",
              maxHeight: "calc(95vh - 50px)",
            }}
          />

          <ActionIcon
            variant="filled"
            color="dark"
            size="lg"
            pos="absolute"
            top={8}
            right={8}
            onClick={onClose}
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            aria-label="Close lightbox"
          >
            <IconX size={18} color="white" />
          </ActionIcon>
        </Box>
      </Center>
    </Modal>
  );
}
