import type { ReactNode } from "react";
import { Box, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

// Every signed-in page starts with this. Explanations go behind the ⓘ so the
// pages stay short.
export function PageHeader({
  title,
  info,
  aside,
  actions,
}: {
  title: string;
  info?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="center" mb="lg" gap="sm">
      <Group gap="xs" align="baseline">
        <Text component="h1" fz={{ base: 24, sm: 28 }} fw={700} lh={1.2} m={0}>
          {title}
        </Text>
        {aside && (
          <Text c="dimmed" size="sm">
            {aside}
          </Text>
        )}
        {info && <InfoTip>{info}</InfoTip>}
      </Group>
      {actions && <Box>{actions}</Box>}
    </Group>
  );
}

export function InfoTip({
  children,
  size = 16,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <Tooltip
      label={children}
      multiline
      w={300}
      events={{ hover: true, focus: true, touch: true }}
    >
      <Box
        component="span"
        tabIndex={0}
        role="img"
        aria-label="More information"
        style={{ display: "inline-flex", alignSelf: "center", cursor: "help" }}
      >
        <IconInfoCircle size={size} color="var(--mantine-color-dimmed)" />
      </Box>
    </Tooltip>
  );
}
