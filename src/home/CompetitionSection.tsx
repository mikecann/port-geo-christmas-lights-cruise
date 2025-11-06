import { Box, Container, Stack, Text, Title, Button } from "@mantine/core";
import { routes } from "../routes";

export default function CompetitionSection() {
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
            Compete for prizes across multiple categories including New
            Entrants, Most Jolly Award, People's Choice, and Onboard Favourites.
            There's a category for everyone!
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
