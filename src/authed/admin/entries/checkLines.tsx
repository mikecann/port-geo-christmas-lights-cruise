import type { ReactNode } from "react";
import { Anchor } from "@mantine/core";
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

export type Tone = "ok" | "warn" | "info";

type CheckLine = {
  key: string;
  tone: Tone;
  icon: ReactNode;
  content: ReactNode;
};

export type ChecksInput = {
  entry: Doc<"entries">;
  previous: AdminEntryDetail["previous"];
  checks: AdminEntryDetail["checks"];
  isNumberOutsideRange: boolean;
  // The detail page has the number in its header, so it only wants the line
  // when something's wrong. Review cards have no header, so they always show it.
  showNumber?: boolean;
};

// What a reviewer checks before approving: where the house is, whether
// they've entered before, their number, and anything that clashes. Built as
// a list so Approve can ask about exactly the warnings shown here.
export function describeChecks({
  entry,
  previous,
  checks,
  isNumberOutsideRange,
  showNumber = false,
}: ChecksInput): CheckLine[] {
  const lines: CheckLine[] = [];
  const add = (key: string, tone: Tone, icon: ReactNode, content: ReactNode) =>
    lines.push({ key, tone, icon, content });

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

  if (checks.isWithinBoundary === false)
    add(
      "area",
      "warn",
      <IconMapPin size={14} />,
      <>Outside the competition area. {mapLink}</>,
    );
  else if (checks.isWithinBoundary)
    add(
      "area",
      "ok",
      <IconMapPin size={14} />,
      <>Inside the competition area. {mapLink}</>,
    );

  for (const other of checks.sameAddress)
    add(
      `same-${other._id}`,
      "warn",
      <IconAlertTriangle size={14} />,
      <>
        {other.isDraft
          ? "Someone else has started an entry for this address: "
          : "Another entry uses this address: "}
        <Anchor {...routes.adminEntry({ entryId: other._id }).link}>
          {other.name || "an unnamed entry"}
        </Anchor>
        {other.isDraft && " (not sent in yet)"}
      </>,
    );

  if (previous)
    add(
      "entrant",
      "info",
      <IconRepeat size={14} />,
      <>
        Returning: #{previous.entryNumber} in {previous.year}
        {/* Some 2025 entries were saved without a name, and some with a
            trailing space, which would land before the comma */}
        {previous.name?.trim() ? " as " : ", "}
        <Anchor {...routes.adminEntry({ entryId: previous._id }).link}>
          {previous.name?.trim() || "see that entry"}
        </Anchor>
      </>,
    );
  else if (lastYearAtAddress)
    // Same house as last year, sent in from a different account
    add(
      "entrant",
      "warn",
      <IconRepeat size={14} />,
      <>
        New account, but this house was #{lastYearAtAddress.entryNumber} in{" "}
        {lastYearAtAddress.year}
        {lastYearAtAddress.name.trim() ? " as " : ", "}
        <Anchor {...routes.adminEntry({ entryId: lastYearAtAddress._id }).link}>
          {lastYearAtAddress.name.trim() || "see that entry"}
        </Anchor>
        {lastYearAtAddress.submitterName &&
          `, entered by ${lastYearAtAddress.submitterName}`}
      </>,
    );
  else add("entrant", "info", <IconSparkles size={14} />, "New entrant");

  if (checks.previousNumberHeldBy && previous)
    add(
      "number-clash",
      "warn",
      <IconAlertTriangle size={14} />,
      <>
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
      </>,
    );

  const { state } = entry;
  // The clash line above already says which number they get
  const clashSaysNumber =
    checks.previousNumberHeldBy &&
    previous &&
    state.kind !== "rejected" &&
    state.entryNumber !== undefined &&
    !isNumberOutsideRange;
  if (state.kind !== "rejected" && !clashSaysNumber)
    if (state.entryNumber === undefined) {
      if (showNumber)
        add(
          "number",
          "info",
          <IconHash size={14} />,
          "Gets a free number when you approve it",
        );
    } else if (isNumberOutsideRange)
      add(
        "number",
        "warn",
        <IconAlertTriangle size={14} />,
        `There's no printed sign for #${state.entryNumber}, as it's outside the number range.`,
      );
    else if (showNumber)
      add(
        "number",
        "ok",
        <IconCheck size={14} />,
        `Number #${state.entryNumber}`,
      );

  return lines;
}

// The warnings a reviewer has to tick off before Approve goes through
export function entryWarnings(input: ChecksInput) {
  return describeChecks(input)
    .filter((line) => line.tone === "warn")
    .map(({ key, content }) => ({ key, content }));
}

export type EntryWarning = ReturnType<typeof entryWarnings>[number];
