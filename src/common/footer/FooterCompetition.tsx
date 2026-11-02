import { Stack, Text } from "@mantine/core";
import { routes } from "../../routes";
import { FooterLink } from "./FooterLink";

export default function FooterCompetition() {
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Competition
      </Text>
      <Stack gap="xs" align="flex-start">
        <FooterLink link={routes.competitionDetails().link}>
          Competition details
        </FooterLink>
      </Stack>
    </Stack>
  );
}
