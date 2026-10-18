import { Box, Container, Stack, Text, Title } from "@mantine/core";
import CompetitionSignUpSection from "./CompetitionSignUpSection";
import PrizeList from "./PrizeList";
import HowVotingWorks from "./HowVotingWorks";
import EntrantSign from "./EntrantSign";
import PrizeTerms from "./PrizeTerms";
import { event, formatMoney } from "../../shared/event";

export default function CompetitionDetailsPage() {
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
            mb="xs"
          >
            Prize pool: {formatMoney(event.prizePool)}
          </Text>
          <Text size="lg" mb="md">
            Light up your house on the Port Geographe canals for Christmas{" "}
            {event.year} and you could win a share of{" "}
            {formatMoney(event.prizePool)}.
          </Text>
          <PrizeList />
        </Box>

        <Section title="How voting works">
          <HowVotingWorks />
        </Section>

        <Section title="Entering">
          <EntrantSign />
        </Section>

        <Section title="Prize rules and judges">
          <PrizeTerms />
        </Section>
      </Stack>
    </Container>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Title order={2} size="h3" mb="sm">
        {title}
      </Title>
      {children}
    </Box>
  );
}
