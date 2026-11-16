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
  showNumber = false,
}: {
  entry: Doc<"entries">;
  previous: AdminEntryDetail["previous"];
  checks: AdminEntryDetail["checks"];
  isNumberOutsideRange: boolean;
  // The detail page has the number in its header, so it only wants the line
  // when something's wrong. Review cards have no header, so they always show it.
  showNumber?: boolean;
}) {
  const { location, lastYearAtAddress } = checks;
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
          {other.isDraft
            ? "Someone else has started an entry for this address: "
            : "Another entry uses this address: "}
          <Anchor {...routes.adminEntry({ entryId: other._id }).link}>
            {other.name || "an unnamed entry"}
          </Anchor>
          {other.isDraft && " (not sent in yet)"}
        </Check>
      ))}

      {previous ? (
        <Check tone="info" icon={<IconRepeat size={14} />}>
          Returning: #{previous.entryNumber} in {previous.year}
          {/* Some 2025 entries were saved without a name, and some with a
              trailing space, which would land before the comma */}
          {previous.name?.trim() ? " as " : ", "}
          <Anchor {...routes.adminEntry({ entryId: previous._id }).link}>
            {previous.name?.trim() || "see that entry"}
          </Anchor>
        </Check>
      ) : lastYearAtAddress ? (
        // Same house as last year, sent in from a different account
        <Check tone="warn" icon={<IconRepeat size={14} />}>
          New account, but this house was #{lastYearAtAddress.entryNumber} in{" "}
          {lastYearAtAddress.year}
          {lastYearAtAddress.name.trim() ? " as " : ", "}
          <Anchor
            {...routes.adminEntry({ entryId: lastYearAtAddress._id }).link}
          >
            {lastYearAtAddress.name.trim() || "see that entry"}
          </Anchor>
          {lastYearAtAddress.submitterName &&
            `, entered by ${lastYearAtAddress.submitterName}`}
        </Check>
      ) : (
        <Check tone="info" icon={<IconSparkles size={14} />}>
          New entrant
        </Check>
      )}

      {checks.previousNumberHeldBy && previous && (
        <Check tone="warn" icon={<IconAlertTriangle size={14} />}>
          Last year's #{previous.entryNumber} is now used by{" "}
          <Anchor
            {...routes.adminEntry({ entryId: checks.previousNumberHeldBy._id })
              .link}
          >
            {checks.previousNumberHeldBy.name || "another entry"}
          </Anchor>
          , so they{" "}
          {entry.state.kind !== "rejected" &&
          entry.state.entryNumber !== undefined
            ? `get #${entry.state.entryNumber} instead`
            : "get a different number"}
          .
        </Check>
      )}

      {entry.state.kind !== "rejected" &&
        // The clash line above already says which number they get
        !(
          checks.previousNumberHeldBy &&
          previous &&
          entry.state.entryNumber !== undefined &&
          !isNumberOutsideRange
        ) &&
        (entry.state.entryNumber === undefined ? (
          showNumber && (
            <Check tone="info" icon={<IconHash size={14} />}>
              Gets a free number when you approve it
            </Check>
          )
        ) : isNumberOutsideRange ? (
          <Check tone="warn" icon={<IconAlertTriangle size={14} />}>
            There's no printed sign for #{entry.state.entryNumber}, as it's
            outside the number range.
          </Check>
        ) : (
          showNumber && (
            <Check tone="ok" icon={<IconCheck size={14} />}>
              Number #{entry.state.entryNumber}
            </Check>
          )
        ))}
    </Stack>
  );
}
