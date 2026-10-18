import { Badge } from "@mantine/core";
import type { Doc } from "../../../convex/_generated/dataModel";

// Returning entrants see the number they're keeping before they're approved
export default function EntryNumberBadge({ entry }: { entry: Doc<"entries"> }) {
  if (entry.entryNumber === undefined || entry.status === "rejected")
    return null;

  const isKeeping =
    entry.status !== "approved" && entry.previousEntryId !== undefined;
  return (
    <Badge color="blue" variant="filled" size="sm">
      {isKeeping
        ? `You'll keep #${entry.entryNumber}`
        : `Entry #${entry.entryNumber}`}
    </Badge>
  );
}
