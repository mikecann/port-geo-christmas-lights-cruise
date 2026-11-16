import type { ReactNode } from "react";
import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { describeChecks, type ChecksInput, type Tone } from "./checkLines";

const TONE_COLORS: Record<Tone, string> = {
  ok: "green",
  warn: "orange",
  info: "gray",
};

function Check({
  tone,
  icon,
  children,
}: {
  tone: Tone;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <ThemeIcon
        size="sm"
        radius="xl"
        variant="light"
        color={TONE_COLORS[tone]}
        mt={2}
      >
        {icon}
      </ThemeIcon>
      <Text size="sm" style={{ flex: 1 }}>
        {children}
      </Text>
    </Group>
  );
}

export default function EntryChecks(props: ChecksInput) {
  return (
    <Stack gap={8}>
      {describeChecks(props).map((line) => (
        <Check key={line.key} tone={line.tone} icon={line.icon}>
          {line.content}
        </Check>
      ))}
    </Stack>
  );
}
