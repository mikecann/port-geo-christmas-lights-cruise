import { Box, Container, Stack, Text, Title, Button } from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { routes } from "../routes";

export default function CompetitionSection() {
  const competition = useQuery(api.public.competitions.current, {});
  return (
    <Box bg="#040826" py={40}>
      <Container size="sm">
        <Stack gap="md" align="center">
          <Title order={2} c="#FBAF5D" mb="sm" ta="center">
            Lights Competition
          </Title>
          <Text c="gray.0" size="lg" fw={600} ta="center">
            Prize pool: $20,000
          </Text>
          <Text c="gray.0" size="md" ta="center" mb="md">
            The {competition?.year} prize categories and allocations are being
            finalised. Full details will be announced soon.
          </Text>
          <Button
            component="a"
            {...routes.competitionDetails().link}
            variant="outline"
            color="#FBAF5D"
            radius="md"
            styles={{
              root: {
                borderColor: "#FBAF5D",
                color: "#FBAF5D",
              },
            }}
          >
            Learn More About the Competition
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
