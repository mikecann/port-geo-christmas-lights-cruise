import { Group, Stack, Text } from "@mantine/core";
import { InfoTip } from "../PageHeader";

// "Entry name" with the naming guidelines behind an ⓘ, so they're there when
// someone wonders what to call it without taking up the form
export default function EntryNameLabel() {
  return (
    <Group component="span" gap={6} display="inline-flex" wrap="nowrap">
      Entry name
      {/* It sits inside the input's <label>, so stop a tap on it from
          focusing the input and opening the phone keyboard */}
      <span
        style={{ display: "inline-flex" }}
        onClick={(e) => e.preventDefault()}
      >
        <InfoTip size={14}>
          <Stack gap={6}>
            <Text size="sm">
              Your entry name, number and address are shown on the site and the
              map, so people can find your display.
            </Text>
            <Text size="sm">
              Please avoid using your own name as your entry name. Instead, give
              your display a fun, festive title.
            </Text>
          </Stack>
        </InfoTip>
      </span>
    </Group>
  );
}
