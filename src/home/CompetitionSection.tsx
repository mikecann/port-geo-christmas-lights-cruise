import { Box, Container, Stack, Text, Title, Button } from "@mantine/core";
import { routes } from "../routes";
import { event, formatDate, formatMoney } from "../../shared/event";

const [topPrize, ...otherPrizes] = event.prizes;
const otherPrizeNames = otherPrizes
  .map((prize) => prize.name)
  .join(", ")
  .replace(/, ([^,]*)$/, " and $1");

export default function CompetitionSection() {
  return (
    <Box bg="#040826" py={40}>
      <Container size="sm">
        <Stack gap="md" align="center">
          <Title order={2} c="#FBAF5D" mb="sm" ta="center">
            Lights Competition
          </Title>
          <Text c="gray.0" size="lg" fw={600} ta="center">
            Prize pool: {formatMoney(event.prizePool)}
          </Text>
          <Text c="gray.0" size="md" ta="center">
            The top prize is {formatMoney(topPrize.awards[0].amount)} for 1st in{" "}
            {topPrize.name}. There are prizes for {otherPrizeNames} too.
          </Text>
          {event.entriesClose && (
            <Text c="gray.0" size="md" ta="center">
              Entries close {formatDate(event.entriesClose)}.
            </Text>
          )}
          <Button
            component="a"
            {...routes.competitionDetails().link}
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
            Learn More About the Competition
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
