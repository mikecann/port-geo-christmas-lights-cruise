import { Stack, Text, Group, ActionIcon } from "@mantine/core";
import { IconBrandFacebook, IconMail } from "@tabler/icons-react";

export function ContactIcons() {
  return (
    <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
      <ActionIcon
        component="a"
        href="https://www.facebook.com/newportgeographe/"
        target="_blank"
        rel="noopener noreferrer"
        size="lg"
        variant="subtle"
        color="gray"
        aria-label="Visit our Facebook page"
      >
        <IconBrandFacebook size={20} />
      </ActionIcon>
      <ActionIcon
        component="a"
        href="mailto:ZOliver@aigleroyal.com.au"
        size="lg"
        variant="subtle"
        color="gray"
        aria-label="Send us an email"
      >
        <IconMail size={20} />
      </ActionIcon>
    </Group>
  );
}

export default function FooterContact() {
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Contact
      </Text>
      <ContactIcons />
    </Stack>
  );
}
