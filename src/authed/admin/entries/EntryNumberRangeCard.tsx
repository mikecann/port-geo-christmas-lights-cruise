import { Button, Card, Group, NumberInput, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useErrorCatchingMutation } from "../../../common/errors";

type Range = { min: number; max: number };

export default function EntryNumberRangeCard() {
  const range = useQuery(
    api.admin.competition.competitions.getEntryNumberRange,
  );
  if (!range) return null;
  // Keyed so the inputs reset when the saved range changes
  return <RangeForm key={`${range.min}-${range.max}`} range={range} />;
}

function RangeForm({ range }: { range: Range }) {
  const [min, setMin] = useState<string | number>(range.min);
  const [max, setMax] = useState<string | number>(range.max);
  const [saveRange, isSaving] = useErrorCatchingMutation(
    api.admin.competition.competitions.setEntryNumberRange,
  );

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Text size="lg" fw={500}>
          Entry numbers
        </Text>
        <Text size="sm" c="dimmed">
          New entrants get a random number from this range, to match the printed
          signs. Returning entrants keep their number from last time, even if
          it's outside the range.
        </Text>
        <Group gap="xs" align="flex-end">
          <NumberInput
            label="From"
            min={0}
            allowDecimal={false}
            allowNegative={false}
            value={min}
            onChange={setMin}
            w={100}
          />
          <NumberInput
            label="To"
            min={0}
            allowDecimal={false}
            allowNegative={false}
            value={max}
            onChange={setMax}
            w={100}
          />
          <Button
            variant="light"
            loading={isSaving}
            disabled={
              typeof min !== "number" ||
              typeof max !== "number" ||
              (min === range.min && max === range.max)
            }
            onClick={() => {
              if (typeof min === "number" && typeof max === "number")
                void saveRange({ min, max });
            }}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
