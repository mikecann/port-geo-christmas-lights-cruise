import type { ReactNode } from "react";
import { Anchor, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconHash,
  IconMapPin,
  IconRepeat,
  IconSparkles,
} from "@tabler/icons-react";
import type { AdminEntryDetail } from "../../../../convex/admin/competition/entries";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { routes } from "../../../routes";

type Tone = "ok" | "warn" | "info";

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

// What a reviewer checks before approving: where the house is, whether
// they've entered before, their number, and anything that clashes
export default function EntryChecks({
  entry,
  previous,
  checks,
  isNumberOutsideRange,
}: {
  entry: Doc<"entries">;
  previous: AdminEntryDetail["previous"];
  checks: AdminEntryDetail["checks"];
  isNumberOutsideRange: boolean;
}) {
  const { location } = checks;
  const mapLink = location && (
    <Anchor
      href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Check on map
    </Anchor>
  );

  return (
    <Stack gap={8}>
      {checks.isWithinBoundary === false ? (
        <Check tone="warn" icon={<IconMapPin size={14} />}>
          Outside the competition area. {mapLink}
        </Check>
      ) : checks.isWithinBoundary ? (
        <Check tone="ok" icon={<IconMapPin size={14} />}>
          Inside the competition area. {mapLink}
        </Check>
      ) : null}

      {checks.sameAddress.map((other) => (
        <Check
          key={other._id}
          tone="warn"
          icon={<IconAlertTriangle size={14} />}
        >
          Another entry uses this address:{" "}
          <Anchor {...routes.adminEntry({ entryId: other._id }).link}>
            {other.name || "an unnamed entry"}
          </Anchor>
        </Check>
      ))}

      {previous ? (
        <Check tone="info" icon={<IconRepeat size={14} />}>
          Returning entrant: #{previous.entryNumber} in {previous.year} as{" "}
          <Anchor {...routes.adminEntry({ entryId: previous._id }).link}>
            {previous.name}
          </Anchor>
        </Check>
      ) : (
        <Check tone="info" icon={<IconSparkles size={14} />}>
          New entrant: no approved entry in earlier years
        </Check>
      )}

      {checks.previousNumberHeldBy && previous && (
        <Check tone="warn" icon={<IconAlertTriangle size={14} />}>
          Last year's number #{previous.entryNumber} is now used by{" "}
          <Anchor
            {...routes.adminEntry({ entryId: checks.previousNumberHeldBy._id })
              .link}
          >
            {checks.previousNumberHeldBy.name || "another entry"}
          </Anchor>
          , so they'll get a different number.
        </Check>
      )}

      {entry.status !== "rejected" &&
        (entry.entryNumber === undefined ? (
          <Check tone="info" icon={<IconHash size={14} />}>
            Gets a free number when you approve it
          </Check>
        ) : (
          <Check
            tone={isNumberOutsideRange ? "warn" : "ok"}
            icon={
              isNumberOutsideRange ? (
                <IconAlertTriangle size={14} />
              ) : (
                <IconCheck size={14} />
              )
            }
          >
            Number #{entry.entryNumber}
            {isNumberOutsideRange &&
              ". There's no printed sign for this number, as it's outside the number range."}
          </Check>
        ))}
    </Stack>
  );
}
