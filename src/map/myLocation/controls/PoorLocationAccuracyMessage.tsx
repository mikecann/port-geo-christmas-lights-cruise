import React, { useState } from "react";
import { Paper, Text, Stack, ActionIcon } from "@mantine/core";
import { IconLocationOff, IconX } from "@tabler/icons-react";

export default function PoorLocationAccuracyMessage() {
  const [expanded, setExpanded] = useState(true);

  if (!expanded)
    return (
      <Paper
        withBorder
        p="xs"
        radius="md"
        shadow="sm"
        style={{ backdropFilter: "blur(4px)" }}
      >
        <ActionIcon
          size="md"
          variant="subtle"
          color="orange"
          onClick={() => setExpanded(true)}
          aria-label="Location accuracy warning - click for details"
        >
          <IconLocationOff size={18} />
        </ActionIcon>
      </Paper>
    );

  // Expanded state - full message
  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      shadow="sm"
      style={{
        backdropFilter: "blur(4px)",
        maxWidth: 280,
        position: "relative",
      }}
    >
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        onClick={() => setExpanded(false)}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
        }}
        aria-label="Close"
      >
        <IconX size={14} />
      </ActionIcon>

      <Stack gap="xs" align="center" pt="xs">
        <IconLocationOff size={24} color="#f59e0b" />
        <Text size="sm" ta="center" c="dimmed">
          Location not precise enough on this device. Try using your phone for
          accurate location.
        </Text>
      </Stack>
    </Paper>
  );
}
