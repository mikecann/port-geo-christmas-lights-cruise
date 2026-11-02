import { Anchor, Card, Stack, Text } from "@mantine/core";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import PhotoGallery from "./photos/PhotoGallery";
import EntryCardHeader from "./EntryCardHeader";
import EntryStatusBadge from "../EntryStatusBadge";

// The rejection email's reply-to, email.replyToAddress in
// convex/features/email/model.ts. That file pulls in the Resend component, so
// it can't be imported here.
const ARG_CONTACT_EMAIL = "ZOliver@aigleroyal.com.au";

interface RejectedEntryStateProps {
  entry: Doc<"entries">;
}

export default function RejectedEntryState({ entry }: RejectedEntryStateProps) {
  const photos = useQuery(api.my.photos.list) ?? [];
  const reason =
    entry.state.kind === "rejected" ? entry.state.rejectedReason.trim() : "";

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <EntryCardHeader
          entry={entry}
          status={<EntryStatusBadge status="rejected" />}
        />

        <Text size="sm" c="dimmed">
          {entry.state.houseAddress?.address}
        </Text>

        {reason && (
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Why it wasn't approved
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {reason}
            </Text>
          </Stack>
        )}

        <Text size="sm" c="dimmed">
          Questions, or want us to take another look?{" "}
          <Anchor
            href={`mailto:${ARG_CONTACT_EMAIL}?subject=${encodeURIComponent(
              `My Christmas lights entry${entry.state.name ? `: ${entry.state.name}` : ""}`,
            )}`}
          >
            Reply to the email we sent you
          </Anchor>
          .
        </Text>

        {photos.length > 0 && (
          <PhotoGallery photos={photos} showEmptyState={false} />
        )}
      </Stack>
    </Card>
  );
}
