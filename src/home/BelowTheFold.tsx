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

          <Box pos="relative" mt="xl">
            {/* Sold Out Overlay */}
            <Box
              pos="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <Box
                bg="rgba(197, 38, 48, 0.95)"
                px="xl"
                py="lg"
                style={{
                  borderRadius: 12,
                  border: "3px solid #FBAF5D",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                }}
              >
                <Title order={2} c="white" ta="center">
                  🎄 Tickets Now Sold Out 🎄
                </Title>
                <Text c="gray.2" ta="center" size="sm" mt="xs">
                  Thank you for your support this season!
                </Text>
              </Box>
            </Box>

            {/* Crossed out original content */}
            <Box style={{ opacity: 0.3, textDecoration: "line-through" }}>
              <Title order={2} c="#FBAF5D" mb="sm">
                Special Christmas Week Cruises
              </Title>
              <Text c="gray.0" mb="lg" size="md">
                Extra cruises will run Monday 22nd to Wednesday 24th December
                (Christmas Eve) - your final chance to experience the magic
                before Christmas!
              </Text>

              <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
                Minimum numbers:
              </Title>
              <Text c="gray.0" mb="lg" size="md">
                To make this cruise happen, we need at least 50 tickets sold. If
                we don't hit the mark, don't worry - you can either get a full
                refund or choose another date to join the fun!
              </Text>

              <Title order={2} c="#FBAF5D" mt="xl" mb="sm">
                Cruise schedule:
              </Title>
              <Text c="gray.0" mb="lg" size="md">
                Not all cruise dates are released at once. To keep the decks
                full and the fun buzzing, new dates are unlocked as earlier
                sessions sell out
              </Text>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
