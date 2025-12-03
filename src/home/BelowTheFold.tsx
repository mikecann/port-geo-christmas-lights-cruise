import { Box, Container, Image, SimpleGrid, Text, Title } from "@mantine/core";

export default function BelowTheFoldCopy() {
  return (
    <Box bg="#02051A" py={20}>
      <Container size="sm">
        <Box ta="center">
          <Title order={2} c="#FBAF5D" mb="sm">
            Event Details
          </Title>
          <Text c="gray.0" mb="xs" size="md">
            Departs Port Geographe Marina
          </Text>
          <Text c="gray.0" mb="xs" size="md">
            General Admission | $18 per ticket
          </Text>
          <Text c="gray.0" mb="xs" size="md">
            Infant (under 12 months) | Free
          </Text>
          <Text c="gray.0" mb="xs" size="md">
            Every Friday, Saturday and Sunday from 5th - 24th Dec | 7:30pm and
            8:30pm
          </Text>
          <Text c="gray.0" mb="xs" size="md">
            All Sea Charters will take you through every canal and under the
            bridge, ensuring all displays are visible.
          </Text>
          <Text c="gray.0" mb="lg" size="md">
            Queries: amcrostie@aigleroyal.com.au
          </Text>

          <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
            Special Christmas Week Cruises
          </Title>
          <Text c="gray.0" mb="lg" size="md">
            Extra cruises will run Monday 22nd to Wednesday 24th December
            (Christmas Eve) - your final chance to experience the magic before
            Christmas!
          </Text>

          <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
            Minimum numbers:
          </Title>
          <Text c="gray.0" mb="lg" size="md">
            To make this cruise happen, we need at least 50 tickets sold. If we
            don't hit the mark, don't worry - you can either get a full refund
            or choose another date to join the fun!
          </Text>

          <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
            Cruise schedule:
          </Title>
          <Text c="gray.0" mb="lg" size="md">
            Not all cruise dates are released at once. To keep the decks full
            and the fun buzzing, new dates are unlocked as earlier sessions sell
            out
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
