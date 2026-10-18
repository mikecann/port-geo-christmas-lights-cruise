import { Box, Container, Stack, Text, Title, Button } from "@mantine/core";
import { routes } from "../routes";
import { cruiseDateRange, event, formatMoney } from "../../shared/event";

export default function CruiseSection() {
  const { cruise } = event;
  const dates = cruiseDateRange(cruise.sailings);
  return (
    <Box py={40}>
      <Container size="sm">
        <Stack gap="md" align="center">
          <Title order={2} c="#FBAF5D" mb="sm" ta="center">
            Christmas Lights Cruise
          </Title>
          {dates && (
            <Text c="gray.0" size="lg" fw={600} ta="center">
              {dates} {event.year}
            </Text>
          )}
          <Text c="gray.0" size="md" ta="center">
            Cruise through all the canals and under the bridge with{" "}
            {cruise.operator}. Tickets are {formatMoney(cruise.ticketPrice)}.
          </Text>
          <Button
            component="a"
            {...routes.tickets().link}
            variant="outline"
            color="#FBAF5D"
            radius="md"
            mt="md"
            styles={{
              root: {
                borderColor: "#FBAF5D",
                color: "#FBAF5D",
              },
            }}
          >
            Cruise Times and Tickets
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
