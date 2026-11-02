import { track } from "../analytics/client";
import { shareLink, type ShareSource } from "../analytics/privacy";
import { Modal, Stack, Button, Group, CopyButton } from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import type { Id } from "../../convex/_generated/dataModel";

export type ShareProperties = {
  entry_id: Id<"entries">;
  competition_id?: string;
  is_entrant: boolean;
};

// The short list for when there is no share sheet to open
export default function ShareModal({
  opened,
  onClose,
  entryId,
  shareText,
  properties,
}: {
  opened: boolean;
  onClose: () => void;
  entryId: Id<"entries">;
  shareText: string;
  properties: ShareProperties;
}) {
  const copyUrl = shareLink(window.location.origin, entryId, "copy");

  const openShareSite = (platform: ShareSource) => {
    track("share_intent", { ...properties, source: platform });
    const url = encodeURIComponent(
      shareLink(window.location.origin, entryId, platform),
    );
    const text = encodeURIComponent(shareText);
    const shareUrl =
      platform === "facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${url}`
        : `https://wa.me/?text=${text}%20${url}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Share" centered size="xs">
      <Stack gap="sm">
        <Group grow>
          <Button
            leftSection={<IconBrandFacebook size={16} />}
            onClick={() => openShareSite("facebook")}
            variant="default"
          >
            Facebook
          </Button>
          <Button
            leftSection={<IconBrandWhatsapp size={16} />}
            onClick={() => openShareSite("whatsapp")}
            variant="default"
          >
            WhatsApp
          </Button>
        </Group>
        <CopyButton value={copyUrl}>
          {({ copied, copy }) => (
            <Button
              variant="default"
              leftSection={
                copied ? <IconCheck size={16} /> : <IconCopy size={16} />
              }
              color={copied ? "teal" : undefined}
              onClick={() => {
                track("share_intent", { ...properties, source: "copy" });
                copy();
              }}
            >
              {copied ? "Link copied" : "Copy link"}
            </Button>
          )}
        </CopyButton>
      </Stack>
    </Modal>
  );
}
