import { Group, Stack, Text, Anchor } from "@mantine/core";

export function Copyright() {
  return (
    <Text c="dimmed" size="xs">
      © {new Date().getFullYear()} Port Geographe Christmas Lights Cruise ·{" "}
      <Anchor href="/analytics.html" c="dimmed" size="xs" underline="always">
        Site analytics
      </Anchor>
    </Text>
  );
}

export default function FooterBottom() {
  return (
    <Group justify="space-between" align="flex-start">
      <Stack gap="xs">
        <Copyright />
        <Text c="dimmed" size="xs">
          All rights reserved.{" "}
          <Anchor
            href="https://mikecann.blog"
            target="_blank"
            rel="noopener noreferrer"
            c="dimmed"
            size="xs"
            underline="always"
          >
            Made with ❤️ for the community.
          </Anchor>
        </Text>
      </Stack>
      <Text c="dimmed" size="xs" ta="right">
        Celebrating the festive spirit of Busselton
      </Text>
    </Group>
  );
}
