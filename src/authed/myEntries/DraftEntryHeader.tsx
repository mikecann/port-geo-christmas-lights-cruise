import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { eventForYear, formatDate } from "../../../shared/event";
import EntryCardHeader from "./EntryCardHeader";

interface DraftEntryHeaderProps {
  entry: Doc<"entries">;
  name: string;
  isSaving: boolean;
  // Set for a returning entrant, to say their number is the one they had
  previousYear?: number;
  onRemove: () => void;
}

export default function DraftEntryHeader({
  entry,
  name,
  isSaving,
  previousYear,
  onRemove,
}: DraftEntryHeaderProps) {
  const competition = useQuery(api.public.competitions.current, {});
  const entriesClose = competition
    ? eventForYear(competition.year)?.entriesClose
    : null;

  // The draft saves itself, so the line says so, and that it still has to be
  // sent in, which is easy to miss otherwise
  const status = [
    isSaving ? "Saving…" : "Saved",
    "not sent in yet",
    entriesClose ? `entries close ${formatDate(entriesClose, true)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <EntryCardHeader
      entry={entry}
      title={
        <Text fw={600} fz={20} lh={1.25} style={{ overflowWrap: "anywhere" }}>
          {name.trim() || "Your entry"}
        </Text>
      }
      status={
        <Text size="sm" c="dimmed">
          {status}
        </Text>
      }
      numberCaption={previousYear ? `yours from ${previousYear}` : undefined}
      actions={
        <Tooltip label="Remove entry">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onRemove}
            aria-label="Remove entry"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      }
    />
  );
}
