import {
  Container,
  Stack,
  Title,
  Text,
  List,
  Divider,
  Box,
  Card,
} from "@mantine/core";
import CompetitionSignUpSection from "./CompetitionSignUpSection";

export default function CompetitionDetailsPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={1} c="#FBAF5D" mb="md">
            Competition Details
          </Title>
          <Text size="xl" fw={600} mb="md">
            Prize pool: $20,000
          </Text>
          <Text size="lg" mb="sm">
            There's a category for everyone:
          </Text>
        </Box>

        <Card withBorder radius="md" p="xl" bg="rgba(251, 175, 93, 0.05)">
          <Stack gap="md">
            <Box>
              <Text fw={600} size="lg" mb="xs">
                New Entrants
              </Text>
              <Text c="dimmed">$1,000 each for 4 × first timers</Text>
            </Box>

            <Box>
              <Text fw={600} size="lg" mb="xs">
                Most Jolly Award
              </Text>
              <Text c="dimmed">$3,000 for the best festive spirit</Text>
            </Box>

            <Box>
              <Text fw={600} size="lg" mb="xs">
                Judges' Favourites / Participation
              </Text>
              <Text c="dimmed">2 × $1,000 prizes</Text>
            </Box>

            <Box>
              <Text fw={600} size="lg" mb="xs">
                People's Choice
              </Text>
              <Text c="dimmed">
                $3,000 (Public online vote via Geographe targeted Facebook
                campaign to open it up to other cruise boats)
              </Text>
            </Box>

            <Box>
              <Text fw={600} size="lg" mb="xs">
                Onboard Favourites (All Sea Charter passengers)
              </Text>
              <Text c="dimmed">1st: $5,000 | 2nd: $2,000 | 3rd: $1,000</Text>
            </Box>
          </Stack>
        </Card>

        <Divider />

        <Box>
          <Title order={3} size="h4" mb="sm">
            Enhanced Prize Structure
          </Title>
          <Text mb="md">
            We've been working closely with the PGLOA to make this year's
            competition bigger and better than ever. To make things more
            inclusive and fair, we've added two new prize categories alongside
            our traditional Best Display and New Entrant awards:
          </Text>

          <List spacing="md" size="md" mb="lg">
            <List.Item>
              <Text>
                <Text component="span" fw={600}>
                  On-board Favourites
                </Text>{" "}
                – Each vote in this category comes from a ticket holder
                purchased through portgeochristmascruise.com.au ensuring voters
                have experienced your display in person
              </Text>
            </List.Item>
            <List.Item>
              <Text>
                <Text component="span" fw={600}>
                  Most Jolly
                </Text>{" "}
                – Celebrating the incredible festive spirit, this category
                recognises residents who go the extra mile - dressing up,
                welcoming boats and creating a magical atmosphere for everyone
              </Text>
            </List.Item>
          </List>
        </Box>

        <Divider />

        <Box>
          <Title order={3} size="h4" mb="sm">
            Signage
          </Title>
          <Text>
            Every entrant will receive an A1 corflute sign with a unique number
            to display on the canal side, so voters know which houses are part
            of the competition.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Title order={2} mb="md">
            Terms & Conditions
          </Title>
          <List spacing="sm" size="md">
            <List.Item>
              Each entrant is eligible to win one prize per year
            </List.Item>
            <List.Item>
              If an entrant qualifies for more than one prize, the highest value
              prize will be awarded and the lower prize will go to the next
              highest votes
            </List.Item>
            <List.Item>
              Entrants may win in consecutive years, with no limit on how many
              years in a row they can participate and be recognised
            </List.Item>
            <List.Item>
              However, the top prize (highest value) cannot be won by the same
              entrant in consecutive years
            </List.Item>
            <List.Item>
              Judges include: Event Sponsors, Port Geo Planning Committee and
              Aigle Royal Group. Final decisions are at the sole discretion of
              ARG
            </List.Item>
          </List>
        </Box>
        <CompetitionSignUpSection />
      </Stack>
    </Container>
  );
}
