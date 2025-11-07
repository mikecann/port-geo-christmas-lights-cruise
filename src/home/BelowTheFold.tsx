import { Box, Container, Image, SimpleGrid, Text, Title } from "@mantine/core";

export default function BelowTheFoldCopy() {
  return (
    <Box bg="#02051A" py={20}>
      <Container size="sm">
        <Box ta="center">
          <Title order={2} c="#FBAF5D" mb="sm">
            Event details
          </Title>
          <Text c="gray.0" mb="md" size="lg" fw={600}>
            The 2025 Port Geographe Christmas Lights Cruise is back and more
            magical than ever!
          </Text>
          <Text c="gray.0" mb="xs" size="md">
            Departs Port Geographe Marina | $18 per person
          </Text>
          <Text c="gray.0" mb="md" size="md">
            Every Friday, Saturday and Sunday from 5th Dec | 7:40pm & 8:40pm
          </Text>
          <Text c="gray.0" mb="lg" size="md">
            All Sea Charters will take you through every canal and under the
            bridge, ensuring all displays are visible.
          </Text>

          <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
            Special Christmas Week Cruises
          </Title>
          <Text c="gray.0" mb="xs" size="md">
            Extra cruises will run Monday 22nd to Wednesday 24th December
            (Christmas Eve) - your final chance to experience the magic before
            Christmas!
          </Text>
          <Text c="gray.0" mb="lg" size="md" fw={600}>
            Please note: Not all cruise dates are released at once. To ensure
            each cruise is full, new dates are made available once earlier
            sessions reach capacity.
          </Text>

          <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
            Ticket redemption at Altair Estate Winery
          </Title>

          <Title order={3} c="#FBAF5D" mt="lg" mb="xs" size="h4">
            Ticket holders - Wine Credit 2026
          </Title>
          <Text c="gray.0" mb="xs" size="md">
            Each cruise ticket entitles you to a $18 wine credit at Altair
            Estate, Wilyabrup. Purchase 4 tickets and receive $72 in wine
            credit.
          </Text>
          <Text c="gray.0" mb="xs" size="md">
            Simply visit our cellar door, enjoy a tasting and present your
            cruise ticket – your credit will already be applied.
          </Text>
          <Text c="gray.0" mb="lg" size="md" fs="italic">
            Offer valid: Wednesday, 7 January 2026 – Sunday, 29 February 2026.
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
