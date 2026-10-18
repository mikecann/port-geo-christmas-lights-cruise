import { Stack, Text } from "@mantine/core";
import { cruiseTimeGroups, event, formatDate } from "../../shared/event";

export default function CruiseSchedule() {
  return (
    <Stack gap="md">
      {cruiseTimeGroups(event.cruise.sailings).map((group) => (
        <Stack key={group.dates[0]} gap={4}>
          <Text fw={700} c="#FBAF5D">
            {group.times}
          </Text>
          <Text>
            {group.dates.map((date) => formatDate(date, true)).join(", ")}
          </Text>
        </Stack>
      ))}
    </Stack>
  );
}
