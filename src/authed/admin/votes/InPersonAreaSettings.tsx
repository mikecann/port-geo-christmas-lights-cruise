import {
  Button,
  Card,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useErrorCatchingMutation } from "../../../common/errors";

type Area = { countries: string[]; waOnly: boolean };

// Where a voter's internet connection has to be for a ticked vote to count
// as in person
export default function InPersonAreaSettings() {
  const area = useQuery(api.admin.competition.competitions.getInPersonArea);
  if (!area) return null;
  // Keyed so the inputs reset when the saved area changes
  return (
    <AreaForm key={`${area.countries.join()}-${area.waOnly}`} area={area} />
  );
}

function AreaForm({ area }: { area: Area }) {
  const [countries, setCountries] = useState(area.countries.join(", "));
  const [waOnly, setWaOnly] = useState(area.waOnly);
  const [saveArea, isSaving] = useErrorCatchingMutation(
    api.admin.competition.competitions.setInPersonArea,
  );

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Text size="lg" fw={500}>
          Where in-person votes can come from
        </Text>
        <Text size="sm" c="dimmed">
          We check roughly where a voter's internet connection is. Votes from
          outside this area count for People's Choice only. Phones sometimes
          show up in the wrong state, so Australia-wide is the safer choice.
        </Text>
        <TextInput
          label="Countries"
          description="Two-letter codes, separated by commas. AU is Australia."
          value={countries}
          onChange={(event) => setCountries(event.currentTarget.value)}
          maw={300}
        />
        <Switch
          label="Western Australia only"
          checked={waOnly}
          onChange={(event) => setWaOnly(event.currentTarget.checked)}
        />
        <Group>
          <Button
            variant="light"
            loading={isSaving}
            onClick={() =>
              void saveArea({
                countries: countries.split(",").filter((c) => c.trim()),
                waOnly,
              })
            }
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
