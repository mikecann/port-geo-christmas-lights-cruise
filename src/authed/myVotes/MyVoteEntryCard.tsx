import { Anchor, Box, Group, Image, Stack, Text } from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { routes } from "../../routes";
import { usePhotoUrl } from "../../common/hooks/usePhotoUrl";

const THUMB = { w: 64, h: 48 };

// One category on My votes: what it is, the display it's for and a way to
// change it. Kept to a single row so both votes fit on a phone at a glance.
export default function MyVoteRow({
  title,
  vote,
  prize,
  canChange,
}: {
  title: string;
  vote: {
    entry: { _id: Id<"entries">; entryNumber: number; name: string };
  } | null;
  // Which prize it counts for, only where that's in question (best display)
  prize?: string;
  canChange: boolean;
}) {
  return (
    <Group gap="sm" wrap="nowrap" py="sm" data-testid="my-vote-row">
      {vote ? (
        <Thumbnail entryId={vote.entry._id} name={vote.entry.name} />
      ) : (
        <Box
          w={THUMB.w}
          h={THUMB.h}
          style={{
            flex: "none",
            borderRadius: "var(--mantine-radius-sm)",
            border: "1px dashed var(--mantine-color-dark-3)",
          }}
        />
      )}
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {title}
        </Text>
        {vote ? (
          <Anchor
            fw={600}
            c="bright"
            underline="hover"
            lineClamp={1}
            {...routes.entry({ entryId: vote.entry._id }).link}
          >
            #{vote.entry.entryNumber} {vote.entry.name}
          </Anchor>
        ) : (
          <Text c="dimmed">No vote yet</Text>
        )}
        {vote && prize && (
          <Text size="xs" c="dimmed">
            {prize}
          </Text>
        )}
      </Stack>
      {vote && canChange && (
        <Anchor
          size="sm"
          style={{ flex: "none" }}
          {...routes.voteByNumber({
            entryNumber: String(vote.entry.entryNumber),
          }).link}
        >
          Change
        </Anchor>
      )}
    </Group>
  );
}

function Thumbnail({
  entryId,
  name,
}: {
  entryId: Id<"entries">;
  name: string;
}) {
  const entryWithPhotos = useQuery(api.public.entries.getWithPhotos, {
    entryId,
  });
  const url = usePhotoUrl(entryWithPhotos?.photos?.[0], { size: "xs" });
  return (
    <Box
      w={THUMB.w}
      h={THUMB.h}
      bg="dark.6"
      style={{
        flex: "none",
        overflow: "hidden",
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      {url && (
        <Image
          src={url}
          alt={name}
          w={THUMB.w}
          h={THUMB.h}
          fit="cover"
          loading="lazy"
          decoding="async"
        />
      )}
    </Box>
  );
}
