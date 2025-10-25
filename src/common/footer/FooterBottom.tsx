import { Group, Stack, Text, Anchor } from "@mantine/core";

export default function FooterBottom() {
  return (
    <Group justify="space-between" align="flex-start">
      <Stack gap="xs">
        <Text c="gray.5" size="sm">
          © 2025 Port Geographe Christmas Lights Cruise
        </Text>
        <Text c="gray.6" size="xs">
          All rights reserved.{" "}
          <Anchor
            component="a"
            href="https://mikecann.blog"
            target="_blank"
            rel="noopener noreferrer"
            c="gray.6"
            style={{ fontSize: "inherit" }}
          >
            Made with ❤️ for the community.
          </Anchor>
        </Text>
      </Stack>
      <Text c="gray.6" size="xs" ta="right">
        Celebrating the festive spirit of Busselton
      </Text>
    </Group>
  );
}
