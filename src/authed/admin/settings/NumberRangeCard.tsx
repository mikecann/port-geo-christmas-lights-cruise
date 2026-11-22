import { Button, Card, Group, NumberInput, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useErrorCatchingMutation } from "../../../common/errors";
import { useIsPhone } from "../../../common/hooks/useIsPhone";

type Range = { min: number; max: number };

export default function NumberRangeCard() {
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
  // The up and down arrows are too small to hit on a phone, which brings up
  // a number pad anyway
  const isPhone = useIsPhone();
  const cannotSave =
    typeof min !== "number" ||
    typeof max !== "number" ||
    (min === range.min && max === range.max);

  return (
    <Card padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Text fw={600}>Number range</Text>
        <Text size="sm" c="dimmed">
          Set this to the numbers you have printed signs for. New entrants get a
          random free number from this range. Returning entrants keep last
          year's number, even if it's outside it.
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
            hideControls={isPhone}
          />
          <NumberInput
            label="To"
            min={0}
            allowDecimal={false}
            allowNegative={false}
            value={max}
            onChange={setMax}
            w={100}
            hideControls={isPhone}
          />
          <Button
            variant="light"
            loading={isSaving}
            disabled={cannotSave}
            // Mantine's disabled grey is the card's own colour, which left
            // Save looking like plain text rather than a button
            bd={
              cannotSave ? "1px solid var(--mantine-color-dark-4)" : undefined
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
