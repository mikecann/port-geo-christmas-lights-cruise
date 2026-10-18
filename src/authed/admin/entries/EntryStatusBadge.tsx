import { Badge } from "@mantine/core";
import type { EntryStatusKinds } from "../../../../convex/features/entries/schema";
import { ENTRY_STATUS_COLORS, ENTRY_STATUS_LABELS } from "./entryStatus";

export default function EntryStatusBadge({
  status,
}: {
  status: EntryStatusKinds;
}) {
  return (
    <Badge color={ENTRY_STATUS_COLORS[status]} variant="light">
      {ENTRY_STATUS_LABELS[status]}
    </Badge>
  );
}
