import {
  ActionIcon,
  AspectRatio,
  Box,
  Center,
  Image,
  Loader,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import PhotoLightbox from "./PhotoLightbox";
import { usePhotoUrl } from "../../../common/hooks/usePhotoUrl";
import type { PhotoDoc } from "../../../../convex/features/photos/schema";

// One photo in a grid, for both My entry and the admin. Every tile is the
// same 4:3 shape, cropped to fill, so a mix of portrait and landscape phone
// photos lines up. Tapping it opens the full photo.
export default function PhotoTile({
  photo,
  onRemove,
  isRemoving = false,
}: {
  photo: PhotoDoc;
  // Leave out to hide the ✕
  onRemove?: () => void;
  isRemoving?: boolean;
}) {
  const [error, setError] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const imageUrl = usePhotoUrl(photo, { size: "md" });
  const lightboxUrl = usePhotoUrl(photo, { size: "lg" });

  const isUploading =
    photo.kind === "convex_stored" && photo.uploadState.status === "uploading";
  const didFailToLoad = error || (!imageUrl && !isUploading);
  const canOpen = !isUploading && !didFailToLoad;

  return (
    <>
      <Box pos="relative">
        <AspectRatio ratio={4 / 3}>
          <UnstyledButton
            onClick={canOpen ? openModal : undefined}
            disabled={!canOpen}
            aria-label="Open photo"
            bg="dark.7"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              overflow: "hidden",
              cursor: canOpen ? "pointer" : "default",
            }}
          >
            {isUploading ? (
              <Center h="100%">
                <Stack gap="xs" align="center">
                  <Loader size="sm" />
                  <Text size="xs" c="dimmed">
                    Uploading…
                  </Text>
                </Stack>
              </Center>
            ) : didFailToLoad ? (
              <Center h="100%">
                <Text size="xs" c="dimmed">
                  Couldn't load
                </Text>
              </Center>
            ) : (
              <Image
                src={imageUrl}
                alt="Entry photo"
                h="100%"
                w="100%"
                fit="cover"
                onError={() => setError(true)}
              />
            )}
          </UnstyledButton>
        </AspectRatio>
        {/* Stays up while uploading, so a stalled upload can still be cleared
            out of its slot */}
        {onRemove && (
          <ActionIcon
            // A big enough target for a thumb, but dark and quiet so it
            // doesn't shout over the photo
            size={32}
            radius="xl"
            variant="filled"
            pos="absolute"
            top={6}
            right={6}
            aria-label="Remove photo"
            loading={isRemoving}
            onClick={onRemove}
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              color: "var(--mantine-color-white)",
              zIndex: 1,
            }}
          >
            <IconX size={16} />
          </ActionIcon>
        )}
      </Box>

      {canOpen ? (
        <PhotoLightbox
          opened={modalOpened}
          onClose={closeModal}
          imageUrl={lightboxUrl || imageUrl}
        />
      ) : null}
    </>
  );
}
