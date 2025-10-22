import { Badge } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { Doc } from "../../../convex/_generated/dataModel";

interface StatusBadgeProps {
  status: Doc<"entries">["status"];
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "approved")
    return (
      <Badge
        color="green"
        variant="light"
        leftSection={<IconCheck size={12} />}
      >
        Approved
      </Badge>
    );

  if (status === "rejected")
    return (
      <Badge color="red" variant="light" leftSection={<IconX size={12} />}>
        Rejected
      </Badge>
    );

  if (status === "submitted")
    return (
      <Badge color="yellow" variant="light">
        Pending Review
      </Badge>
    );

  return (
    <Badge color="gray" variant="light">
      Draft
    </Badge>
  );
}
