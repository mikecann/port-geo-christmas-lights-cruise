import { Group, Stack, Text } from "@mantine/core";
import { cruiseTimeGroups, event, formatDate } from "../../shared/event";

// The sailings are in Busselton, so "tonight" is Perth's date whatever the
// phone's clock says. en-CA formats as YYYY-MM-DD, like the sailing dates.
const perthToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth" }).format(
    new Date(),
  );

// Monday of the date's week, so each week of sailings gets its own row
function weekOf(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function byWeek(dates: string[]) {
  const weeks = new Map<string, string[]>();
  for (const date of dates) {
    const week = weekOf(date);
    weeks.set(week, [...(weeks.get(week) ?? []), date]);
  }
  return [...weeks.values()];
}

export default function CruiseSchedule() {
  const today = perthToday();
  return (
    <Stack gap="lg">
      {cruiseTimeGroups(event.cruise.sailings).map((group) => (
        <Stack key={group.dates[0]} gap="xs">
          <Text fw={700}>{group.times}</Text>
          {byWeek(group.dates).map((week) => (
            <Group key={week[0]} gap={6}>
              {week.map((date) => (
                <DateChip
                  key={date}
                  date={date}
                  isTonight={date === today}
                  isPast={date < today}
                />
              ))}
            </Group>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

function DateChip({
  date,
  isTonight,
  isPast,
}: {
  date: string;
  isTonight: boolean;
  isPast: boolean;
}) {
  return (
    <Text
      component="span"
      size="sm"
      fw={isTonight ? 700 : 500}
      px={10}
      py={4}
      style={{
        borderRadius: 999,
        whiteSpace: "nowrap",
        // Orange only for tonight, the one that matters; sailed nights fade
        background: isTonight ? "#FBAF5D" : "var(--mantine-color-dark-5)",
        color: isTonight ? "#0b1c3b" : undefined,
        opacity: isPast ? 0.45 : 1,
      }}
    >
      {isTonight
        ? `Tonight, ${formatDate(date, true)}`
        : formatDate(date, true)}
    </Text>
  );
}
