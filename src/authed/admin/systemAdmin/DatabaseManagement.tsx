import { Stack, Group, Button, Divider, Text } from "@mantine/core";
import { IconDatabase, IconExternalLink } from "@tabler/icons-react";
import { getConvexDeploymentName } from "../../../common/utils/convex";
import { iife } from "../../../../shared/misc";

export default function DatabaseManagement() {
  return (
    <Stack gap="md">
      <Group>
        <IconDatabase size={24} color="var(--mantine-color-blue-6)" />
        <div>
          <Text size="md" fw={500}>
            Database Management
          </Text>
          <Text size="sm" c="dimmed">
            Access the Convex dashboard to manage your database
          </Text>
        </div>
      </Group>

      <Button
        leftSection={<IconExternalLink size={16} />}
        component="a"
        href={iife(() => {
          const deployment = getConvexDeploymentName();
          return deployment
            ? `https://dashboard.convex.dev/d/${deployment}`
            : "https://dashboard.convex.dev";
        })}
        target="_blank"
        rel="noopener noreferrer"
        size="md"
        variant="outline"
        color="blue"
      >
        Open Convex Dashboard
      </Button>

      <Divider />
      <Divider />
    </Stack>
  );
}

