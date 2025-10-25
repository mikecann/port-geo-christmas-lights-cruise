import { Container, Stack, Divider, SimpleGrid, Box } from "@mantine/core";
import FooterNavigation from "./FooterNavigation";
import FooterEventInfo from "./FooterEventInfo";
import FooterContact from "./FooterContact";
import FooterCompetition from "./FooterCompetition";
import FooterBottom from "./FooterBottom";

export default function Footer() {
  return (
    <Box
      bg="#0a0f1a"
      py={{ base: 40, md: 60 }}
      style={{
        borderTop: "2px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Container size="lg">
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            <FooterNavigation />
            <FooterEventInfo />
            <FooterContact />
            <FooterCompetition />
          </SimpleGrid>

          <Divider color="dark.4" />

          <FooterBottom />
        </Stack>
      </Container>
    </Box>
  );
}
