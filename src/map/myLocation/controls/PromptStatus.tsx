import * as React from "react";
import { Paper, Button } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import { useUserLocationContext } from "../useUserLocationContext";

export const PromptStatus: React.FC = () => {
  const { startTracking } = useUserLocationContext();
  return (
    <Paper
      withBorder
      p="xs"
      radius="md"
      shadow="sm"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <Button
        size="sm"
        variant="filled"
        leftSection={<IconMapPin size={16} />}
        onClick={() => startTracking()}
      >
        Show Me
      </Button>
    </Paper>
  );
};
