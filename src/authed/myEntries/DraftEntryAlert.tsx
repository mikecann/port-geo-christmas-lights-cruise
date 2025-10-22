import { Alert, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export default function DraftEntryAlert() {
  return (
    <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
      <Text size="sm" fw={500} mb={4}>
        Complete Your Entry
      </Text>
      <Text size="sm">
        Fill out all required information and upload photos of your Christmas
        lights display, then submit your entry for admin review and approval.
      </Text>
    </Alert>
  );
}
