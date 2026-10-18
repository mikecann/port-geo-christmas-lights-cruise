import { Box, Container, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import CompetitionSignUpSection from "./CompetitionSignUpSection";

export default function CompetitionDetailsPage() {
  const competition = useQuery(api.public.competitions.current, {});
  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={1} c="#FBAF5D" mb="md">
            Competition Details
          </Title>
          <CompetitionSignUpSection />
        </Box>

        <Box>
          <Text
            data-testid="competition-prize-pool"
            size="2em"
            fw={600}
            mb="md"
          >
            Prize pool: $20,000
          </Text>
          <Text size="lg">
            The {competition?.year} prize categories and allocations are being
            finalised. The full prize breakdown and competition terms will be
            published here once they are confirmed.
          </Text>
        </Box>
      </Stack>
    </Container>
  );
}
