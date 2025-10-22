import { Box, Container, Image, SimpleGrid, Text, Title } from "@mantine/core";

export default function BelowTheFoldCopy() {
  return (
    <Box bg="#02051A" py={20}>
      <Container size="sm">
        <Box ta="center">
          <Title c="#FBAF5D" mb="sm">
            Port Geographe Christmas Lights Cruise
          </Title>
          <Text c="gray.0" mb="md">
            The Port Geographe Christmas Lights Cruise returns for its 6th year,
            spreading Christmas cheer and bringing the Busselton community
            together.
          </Text>
          <Text c="gray.0" mb="md">
            Cruises depart from the Port Geographe Marina main jetty at 7:30pm
            and 8:30pm every Friday and Saturday from 6th December 2024. With
            the final cruises taking place up until Christmas Eve!
          </Text>
          <Text c="gray.0" mb="md">
            Stay tuned for upcoming ticket releases!
          </Text>
          <Text c="gray.0" mb="md">
            Step aboard a larger, upgraded vessel this year! Enjoy cushioned,
            built-in seating outdoors on each level, plus comfortable lounge
            seating inside both cabins. The boat also features spacious
            walk-around decks on each level, offering the ultimate viewing
            experience.
          </Text>

          <Title order={4} c="#FBAF5D" mt="lg" mb="xs">
            Ticket Redemption
          </Title>
          <Text c="gray.0" size="lg">
            Each ticket purchased entitles you to a $15 wine credit at Altair
            Estate, redeemable as of 3rd January 2025 at the Altair Estate
            cellar door, Wilyabrup. Simply present your ticket on your visit.
            Offer valid until 28 February 2025.
          </Text>
          <Image
            src="/Event-Brite-web-banner-1024x576.png"
            alt="Port Geographe Christmas Lights Cruise"
            pt={60}
            loading="lazy"
            decoding="async"
          />
        </Box>
      </Container>
    </Box>
  );
}
