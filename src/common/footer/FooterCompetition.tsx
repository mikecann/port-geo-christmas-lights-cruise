import { Stack, Text, Anchor } from "@mantine/core";
import { routes } from "../../routes";

export default function FooterCompetition() {
  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Competition
      </Text>
      <Stack gap="xs">
        <Anchor
          component="a"
          {...routes.competitionDetails().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          Competition Details
        </Anchor>
      </Stack>
    </Stack>
  );
}
