import {
  Modal,
  Stack,
  Title,
  Button,
  Group,
  Text,
  CopyButton,
  ActionIcon,
  Tooltip,
  Card,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandX,
  IconBrandWhatsapp,
  IconBrandLinkedin,
  IconMail,
  IconCopy,
  IconCheck,
  IconShare,
} from "@tabler/icons-react";
import type { Id } from "../../convex/_generated/dataModel";

type ShareModalProps = {
  opened: boolean;
  onClose: () => void;
  entry: {
    name: string;
    houseAddress:
      | string
      | { address: string; lat: number; lng: number }
      | { address: string; placeId: string }
      | undefined;
    entryNumber: number;
  };
  entryId: Id<"entries">;
};

export default function ShareModal({
  opened,
  onClose,
  entry,
  entryId,
}: ShareModalProps) {
  // Generate the current URL for this entry
  const entryUrl = `${window.location.origin}/entries/${entryId}`;
  const shareTitle = `Check out ${entry.name} - Entry #${entry.entryNumber}`;
  const shareText = `${shareTitle} in the Port Geographe Christmas Lights competition!`;

  // Check if Web Share API is supported
  const canWebShare = navigator.share !== undefined;

  const handleSocialShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(entryUrl);
    const encodedText = encodeURIComponent(shareText);

    let shareUrl = "";

    if (platform === "facebook")
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    else if (platform === "twitter")
      shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    else if (platform === "whatsapp")
      shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    else if (platform === "linkedin")
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    else if (platform === "email")
      shareUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodedText}%20${encodedUrl}`;

    if (shareUrl) window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Share Entry" centered>
      <Stack gap="lg">
        <div>
          <Title order={4} mb="xs">
            {entry.name}
          </Title>
          <Text size="sm" c="dimmed">
            Entry #{entry.entryNumber}
          </Text>
        </div>

        {/* Web Share API button (mobile) */}
        {canWebShare && (
          <Button
            leftSection={<IconShare size={16} />}
            onClick={async () => {
              if (canWebShare)
                try {
                  await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: entryUrl,
                  });
                } catch (error) {
                  // User cancelled or error occurred
                  console.log("Share cancelled or failed");
                }
            }}
            variant="filled"
            color="blue"
            fullWidth
          >
            Share
          </Button>
        )}

        {/* Social media buttons */}
        <Stack gap="md">
          <Text size="sm" fw={500}>
            Share on social media:
          </Text>

          <Group grow>
            <Button
              leftSection={<IconBrandFacebook size={16} />}
              onClick={() => handleSocialShare("facebook")}
              color="blue"
              variant="light"
            >
              Facebook
            </Button>

            <Button
              leftSection={<IconBrandX size={16} />}
              onClick={() => handleSocialShare("twitter")}
              color="dark"
              variant="light"
            >
              X
            </Button>
          </Group>

          <Group grow>
            <Button
              leftSection={<IconBrandWhatsapp size={16} />}
              onClick={() => handleSocialShare("whatsapp")}
              color="green"
              variant="light"
            >
              WhatsApp
            </Button>

            <Button
              leftSection={<IconBrandLinkedin size={16} />}
              onClick={() => handleSocialShare("linkedin")}
              color="blue"
              variant="light"
            >
              LinkedIn
            </Button>
          </Group>

          <Button
            leftSection={<IconMail size={16} />}
            onClick={() => handleSocialShare("email")}
            color="gray"
            variant="light"
            fullWidth
          >
            Email
          </Button>
        </Stack>

        {/* Copy link section */}
        <Card withBorder p="md">
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Or copy link:
            </Text>
            <Group gap="xs">
              <Text
                size="sm"
                style={{
                  flex: 1,
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                }}
                c="dimmed"
              >
                {entryUrl}
              </Text>
              <CopyButton value={entryUrl}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied!" : "Copy"}>
                    <ActionIcon color={copied ? "teal" : "gray"} onClick={copy}>
                      {copied ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconCopy size={16} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
}
