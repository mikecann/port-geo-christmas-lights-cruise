import { Stack, Text } from "@mantine/core";
import { routes } from "../../routes";
import { EnterCompetitionLink, FooterLink } from "./FooterLink";

export default function FooterNavigation() {
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Navigation
      </Text>
      <Stack gap="xs" align="flex-start">
        <FooterLink link={routes.home().link}>Home</FooterLink>
        <FooterLink link={routes.entries().link}>Entries</FooterLink>
        <FooterLink link={routes.map().link}>Map</FooterLink>
        <EnterCompetitionLink>Enter the competition</EnterCompetitionLink>
      </Stack>
    </Stack>
  );
}
