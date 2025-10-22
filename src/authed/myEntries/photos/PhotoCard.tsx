import {
  Box,
  Center,
  Image,
  Text,
  ActionIcon,
  Loader,
  Stack,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../../../../convex/_generated/api";
import { useConfirmation } from "../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../common/errors";
import PhotoLightbox from "./PhotoLightbox";
import { usePhotoUrl } from "../../../common/hooks/usePhotoUrl";
import type { PhotoDoc } from "../../../../convex/features/photos/schema";

interface PhotoCardProps {
  photo: PhotoDoc;
  canRemove?: boolean;
}

export default function PhotoCard({
  photo,
  canRemove = false,
}: PhotoCardProps) {
  const [removePhoto, isRemoving] = useErrorCatchingMutation(
    api.my.photos.remove,
  );
  const { confirm } = useConfirmation();
  const [error, setError] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const imageUrl = usePhotoUrl(photo, { size: "md" }); // Medium size for user photo management
  const lightboxUrl = usePhotoUrl(photo); // Default (md) size for lightbox

  const isUploading =
    photo.kind === "convex_stored" && photo.uploadState.status === "uploading";

  const didFailToLoad = error || (!imageUrl && !isUploading);

  return (
    <>
      <Box
        pos="relative"
        style={{
          minHeight: "200px",
          maxHeight: "300px",
          cursor: isUploading || didFailToLoad ? "default" : "pointer",
          transition: "transform 0.2s ease",
          borderRadius: "4px",
          overflow: "hidden",
        }}
        onClick={() => {
          if (!isUploading && !didFailToLoad) openModal();
        }}
        onMouseEnter={(e) => {
          if (!isUploading && !didFailToLoad)
            e.currentTarget.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          if (!isUploading && !didFailToLoad)
            e.currentTarget.style.transform = "scale(1)";
        }}
        bg="dark.7"
      >
        {isUploading ? (
          <Center
            h="200px"
            style={{ border: "1px solid #dee2e6", borderRadius: "8px" }}
          >
            <Stack gap="xs" align="center">
              <Loader size="md" />
              <Text size="xs" c="dimmed">
                Uploading...
              </Text>
            </Stack>
          </Center>
        ) : didFailToLoad ? (
          <Center
            h="200px"
            style={{ border: "1px solid #dee2e6", borderRadius: "8px" }}
          >
            <Text size="xs" c="dimmed">
              Failed to load
            </Text>
          </Center>
        ) : (
          <Image
            src={imageUrl}
            alt="Entry photo"
            fit="contain"
            radius="md"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "300px",
              minHeight: "200px",
            }}
            onError={() => setError(true)}
          />
        )}
        {canRemove && photo.kind === "convex_stored" && (
          <ActionIcon
            variant="filled"
            color="red"
            size="sm"
            pos="absolute"
            top={4}
            right={4}
            onClick={async (e) => {
              e.stopPropagation(); // Prevent modal from opening
              const confirmed = await confirm({
                title: "Remove Photo",
                content:
                  "Are you sure you want to remove this photo from your entry?",
                confirmButton: "Remove Photo",
                confirmButtonColor: "red",
              });
              if (!confirmed) return;
              removePhoto({ photoId: photo._id });
            }}
            loading={isRemoving}
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
          >
            <IconX size={12} />
          </ActionIcon>
        )}
      </Box>

      {!isUploading && !didFailToLoad ? (
        <PhotoLightbox
          opened={modalOpened}
          onClose={closeModal}
          imageUrl={lightboxUrl || imageUrl} // Use md size for lightbox, fallback to medium
        />
      ) : null}
    </>
  );
}
