import { Stack, Text, Group, ActionIcon } from "@mantine/core";
import { IconBrandFacebook, IconMail } from "@tabler/icons-react";

export default function FooterContact() {
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Contact
      </Text>
      <Group gap="xs">
        <ActionIcon
          component="a"
          href="https://www.facebook.com/newportgeographe/"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          variant="subtle"
          color="blue"
          aria-label="Visit our Facebook page"
        >
          <IconBrandFacebook size={20} />
        </ActionIcon>
        <ActionIcon
          component="a"
          href="mailto:AMcRostie@aigleroyal.com.au"
          size="lg"
          variant="subtle"
          color="gray"
          aria-label="Send us an email"
        >
          <IconMail size={20} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
