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
            Departs Port Geographe Marina | $15 per person
          </Text>
          <Text c="gray.0" mb="md" size="md">
            Every Friday, Saturday and Sunday from 5th Dec | 7:40pm & 8:40pm
          </Text>
          <Text c="gray.0" mb="lg" size="md">
            All Sea Charters will take you through every canal and under the
            bridge, ensuring all displays are visible.
          </Text>

          <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
            Ticket redemption at Altair Estate Winery
          </Title>

          <Title order={3} c="#FBAF5D" mt="lg" mb="xs" size="h4">
            Ticket holders - Wine Credit 2026
          </Title>
          <Text c="gray.0" mb="xs" size="md">
            Each cruise ticket entitles you to a $15 wine credit at Altair
            Estate, Wilyabrup. Purchase 4 tickets and receive $60 in wine
            credit.
          </Text>
          <Text c="gray.0" mb="xs" size="md">
            Simply visit our cellar door, enjoy a tasting and present your
            cruise ticket – your credit will already be applied.
          </Text>
          <Text c="gray.0" mb="lg" size="md" fs="italic">
            Offer valid: Wednesday, 7 January 2026 – Sunday, 29 February 2026.
          </Text>

          <Title order={3} c="#FBAF5D" mt="lg" mb="xs" size="h4">
            Competition Entrants – Complimentary Tasting + Purchase Incentive
          </Title>
          <Text c="gray.0" mb="xs" size="md">
            Bring your entry confirmation to Altair Estate for a complimentary
            wine tasting for two and $10 off any bottle purchase.
          </Text>
          <Text c="gray.0" mb="xs" size="md" fs="italic">
            Offer valid: Wednesday, 7 January 2026 – Sunday, 29 February 2026.*
          </Text>
          <Text c="gray.0" mb="lg" size="sm" fs="italic">
            *Entry must be presented at the cellar door
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
