import { api } from "../../../../../convex/_generated/api";
import { useConfirmation } from "../../../../common/components/confirmation/useConfirmation";
import { useErrorCatchingMutation } from "../../../../common/errors";
import PhotoTile from "../../../myEntries/photos/PhotoTile";
import type { PhotoDoc } from "../../../../../convex/features/photos/schema";

interface AdminPhotoCardProps {
  photo: PhotoDoc;
  canRemove: boolean;
}

export default function AdminPhotoCard({
  photo,
  canRemove,
}: AdminPhotoCardProps) {
  const [removePhoto, isRemoving] = useErrorCatchingMutation(
    api.admin.competition.photos.remove,
  );
  const { confirm } = useConfirmation();

  return (
    <PhotoTile
      photo={photo}
      isRemoving={isRemoving}
      onRemove={
        canRemove
          ? async () => {
              const confirmed = await confirm({
                title: "Remove this photo?",
                content:
                  "It will be taken off the entry everywhere on the site. This can't be undone.",
                confirmButton: "Remove photo",
                confirmButtonColor: "red",
              });
              if (!confirmed) return;
              removePhoto({ photoId: photo._id });
            }
          : undefined
      }
    />
  );
}
