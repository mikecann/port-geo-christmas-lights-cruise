import {
  Container,
  Stack,
  Divider,
  SimpleGrid,
  Box,
  Group,
  Text,
} from "@mantine/core";
import type { ReactNode } from "react";
import { routes } from "../../routes";
import FooterNavigation from "./FooterNavigation";
import FooterEventInfo from "./FooterEventInfo";
import FooterContact, { ContactIcons } from "./FooterContact";
import FooterCompetition from "./FooterCompetition";
import FooterBottom, { Copyright } from "./FooterBottom";
import { EnterCompetitionLink, FooterLink } from "./FooterLink";

export default function Footer() {
  return (
    <Box
      bg="#0a0f1a"
      py={{ base: "lg", md: 60 }}
      style={{
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Container size="lg">
        <PhoneFooter />
        <Stack gap="xl" visibleFrom="md">
          <SimpleGrid cols={4} spacing="xl">
            <FooterNavigation />
            <FooterEventInfo />
            <FooterContact />
            <FooterCompetition />
          </SimpleGrid>

          <Divider color="dark.4" />

          <FooterBottom />
        </Stack>
      </Container>
    </Box>
  );
}

const DOT_WIDTH = 8;

// The columns stack into a whole screen of footer on a phone, on every page,
// so phones get one row of links instead
function PhoneFooter() {
  const links: ReactNode[] = [
    <FooterLink key="entries" link={routes.entries().link}>
      Entries
    </FooterLink>,
    <FooterLink key="map" link={routes.map().link}>
      Map
    </FooterLink>,
    <FooterLink key="tickets" link={routes.tickets().link}>
      Tickets
    </FooterLink>,
    <FooterLink
      key="competitionDetails"
      link={routes.competitionDetails().link}
    >
      Competition
    </FooterLink>,
    <EnterCompetitionLink key="enter">Enter</EnterCompetitionLink>,
  ];
  return (
    <Stack gap="sm" hiddenFrom="md">
      {/* Every link carries a dot in front, and the row is pulled left by
          one dot so the first dot on each line sits outside the clipped box.
          That way a wrapped line never starts or ends on a dot. The padding
          keeps the links' focus rings inside the clip. */}
      <Box style={{ overflow: "hidden" }} ml={-4} pl={4}>
        <Group gap={8} style={{ rowGap: 4, marginLeft: -(DOT_WIDTH + 8) }}>
          {links.map((link, i) => (
            <Group key={i} gap={8} wrap="nowrap">
              <Text c="dimmed" size="sm" w={DOT_WIDTH} ta="center" aria-hidden>
                ·
              </Text>
              {link}
            </Group>
          ))}
        </Group>
      </Box>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Copyright />
        <ContactIcons />
      </Group>
    </Stack>
  );
}
