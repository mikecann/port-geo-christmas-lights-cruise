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
import { api } from "../../../../../convex/_generated/api";
import { useConfirmation } from "../../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../../common/errors";
import PhotoLightbox from "../../../myEntries/photos/PhotoLightbox";
import { usePhotoUrl } from "../../../../common/hooks/usePhotoUrl";
import type { PhotoDoc } from "../../../../../convex/features/photos/schema";

interface AdminPhotoCardProps {
  photo: PhotoDoc;
}

export default function AdminPhotoCard({ photo }: AdminPhotoCardProps) {
  const [removePhoto, isRemoving] = useErrorCatchingMutation(
    api.admin.competition.photos.remove,
  );
  const { confirm } = useConfirmation();
  const [error, setError] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const imageUrl = usePhotoUrl(photo, { size: "md" });
  const lightboxUrl = usePhotoUrl(photo);

  const isUploading =
    photo.kind === "convex_stored" && photo.uploadState.status === "uploading";

  const didFailToLoad = error || (!imageUrl && !isUploading);

  return (
    <>
      <Box
        pos="relative"
        style={{
          minHeight: "120px",
          maxHeight: "200px",
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
            h="120px"
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
            h="120px"
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
            fit="cover"
            h={120}
            radius="sm"
            onError={() => setError(true)}
          />
        )}
        {!isUploading && (
          <ActionIcon
            variant="filled"
            color="red"
            size="sm"
            pos="absolute"
            top={4}
            right={4}
            onClick={async (e) => {
              e.stopPropagation();
              const confirmed = await confirm({
                title: "Remove Photo",
                content:
                  "Are you sure you want to remove this photo from this entry?",
                confirmButton: "Remove Photo",
                confirmButtonColor: "red",
              });
              if (!confirmed) return;
              removePhoto({ photoId: photo._id });
            }}
            loading={isRemoving}
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.3)", zIndex: 10 }}
          >
            <IconX size={12} />
          </ActionIcon>
        )}
      </Box>

      {!isUploading && !didFailToLoad ? (
        <PhotoLightbox
          opened={modalOpened}
          onClose={closeModal}
          imageUrl={lightboxUrl || imageUrl}
        />
      ) : null}
    </>
  );
}
