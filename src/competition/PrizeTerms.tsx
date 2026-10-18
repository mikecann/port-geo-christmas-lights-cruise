import { List, Stack, Text } from "@mantine/core";
import { event, formatDate } from "../../shared/event";

export default function PrizeTerms() {
  return (
    <Stack gap="sm">
      <List spacing="xs">
        {event.prizeTerms.map((term) => (
          <List.Item key={term}>{term}</List.Item>
        ))}
      </List>
      <Text>{event.judges}</Text>
      {event.winnersPresentation && (
        <Text>
          Winners will be announced at a presentation on{" "}
          {formatDate(event.winnersPresentation)}.
        </Text>
      )}
    </Stack>
  );
}
