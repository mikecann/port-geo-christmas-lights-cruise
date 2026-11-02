import { Button, Popover, Stack, Text } from "@mantine/core";
import { IconCurrentLocationOff } from "@tabler/icons-react";
import { LocateButton } from "./LocateButton";
import { useUserLocationContext } from "../useUserLocationContext";

// The crossed-out locate button. Tapping it says what went wrong (the ⓘ),
// with a way to try again once it's sorted.
export function LocationProblem({ message }: { message: string }) {
  const { startTracking } = useUserLocationContext();
  return (
    <Popover position="left-end" withArrow shadow="md" width={240}>
      <Popover.Target>
        <LocateButton label="Can't show where you are">
          <IconCurrentLocationOff
            size={22}
            color="var(--mantine-color-orange-7)"
          />
        </LocateButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm">{message}</Text>
          <Button size="xs" variant="light" onClick={() => startTracking()}>
            Try again
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
