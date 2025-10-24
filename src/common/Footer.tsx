import {
  Container,
  Group,
  Text,
  Stack,
  Anchor,
  Divider,
  SimpleGrid,
  Box,
  ActionIcon,
} from "@mantine/core";
import { IconBrandFacebook, IconMail } from "@tabler/icons-react";
import { routes } from "../routes";

export default function Footer() {
  return (
    <Box
      bg="#0a0f1a"
      py={{ base: 40, md: 60 }}
      style={{
        borderTop: "2px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Container size="lg">
        <Stack gap="xl">
          {/* Main Footer Content */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            {/* Navigation */}
            <Stack gap="md">
              <Text fw={600} c="white" size="lg">
                Navigation
              </Text>
              <Stack gap="xs">
                <Anchor
                  component="a"
                  {...routes.home().link}
                  c="gray.4"
                  td="none"
                  style={{ fontSize: 14 }}
                >
                  Home
                </Anchor>
                <Anchor
                  component="a"
                  {...routes.entries().link}
                  c="gray.4"
                  td="none"
                  style={{ fontSize: 14 }}
                >
                  View Entries
                </Anchor>
                <Anchor
                  component="a"
                  {...routes.tickets().link}
                  c="gray.4"
                  td="none"
                  style={{ fontSize: 14 }}
                >
                  Book Tickets
                </Anchor>
                <Anchor
                  component="a"
                  {...routes.map().link}
                  c="gray.4"
                  td="none"
                  style={{ fontSize: 14 }}
                >
                  Map View
                </Anchor>
              </Stack>
            </Stack>

            {/* Event Info */}
            <Stack gap="md">
              <Text fw={600} c="white" size="lg">
                Event Info
              </Text>
              <Stack gap="xs">
                <Text c="gray.4" size="sm">
                  Port Geographe Christmas Lights Cruise
                </Text>
                <Text c="gray.4" size="sm">
                  December 2025
                </Text>
                <Text c="gray.4" size="sm">
                  Busselton, Western Australia
                </Text>
              </Stack>
            </Stack>

            {/* Contact */}
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
                  href="mailto:nansara@aigleroyal.com.au"
                  size="lg"
                  variant="subtle"
                  color="gray"
                  aria-label="Send us an email"
                >
                  <IconMail size={20} />
                </ActionIcon>
              </Group>
            </Stack>

            <Stack gap="md">
              <Text fw={600} c="white" size="lg">
                Competition
              </Text>
              <Stack gap="xs">
                <Anchor
                  component="a"
                  {...routes.competitionDetails().link}
                  c="gray.4"
                  td="none"
                  style={{ fontSize: 14 }}
                >
                  Competition Details
                </Anchor>
              </Stack>
            </Stack>
          </SimpleGrid>

          <Divider color="dark.4" />

          {/* Bottom Footer */}
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <Text c="gray.5" size="sm">
                © 2025 Port Geographe Christmas Lights Cruise
              </Text>
              <Text c="gray.6" size="xs">
                All rights reserved. Made with ❤️ for the community.
              </Text>
            </Stack>
            <Text c="gray.6" size="xs" ta="right">
              Celebrating the festive spirit of Busselton
            </Text>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
