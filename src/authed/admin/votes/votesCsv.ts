import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import type {
  LocationCheck,
  VoterLocation,
} from "../../../../convex/features/votes/schema";
import { VOTE_CATEGORY_DETAILS } from "../../../../convex/features/votes/schema";

export type AdminVote = FunctionReturnType<
  typeof api.admin.competition.votes.getAllVotesForExport
>[number];

export const LOCATION_CHECK_LABELS: Record<LocationCheck, string> = {
  ok: "In the area",
  outside_area: "Outside the area",
  no_location: "Location unknown",
  invalid: "Location not genuine",
  expired: "Location too old",
  not_configured: "Check switched off",
};

export const placeName = (location: VoterLocation | undefined) =>
  location
    ? [location.city, location.region, location.country]
        .filter(Boolean)
        .join(", ")
    : "";

// What the vote counts for, in the words admins use
export const countsFor = (vote: AdminVote) => {
  if (vote.category)
    return `2025 ${VOTE_CATEGORY_DETAILS[vote.category].title}`;
  return vote.inPerson
    ? "In-Person Favourites and People's Choice"
    : "People's Choice";
};

const escapeCSV = (value: string | number | boolean | undefined) => {
  if (value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export function votesToCsv(votes: AdminVote[]) {
  const yesNo = (value: boolean | undefined) =>
    value === undefined ? undefined : value ? "yes" : "no";
  const headers = [
    "date and time of vote",
    "entry number",
    "entry name",
    "voter email",
    "voter name",
    "counts for",
    "vote category",
    "in person",
    "ticked seen in person",
    "location check",
    "country",
    "region",
    "region code",
    "city",
    "latitude",
    "longitude",
    "timezone",
  ];
  const rows = votes.map((vote) =>
    [
      new Date(vote.castAt).toISOString(),
      vote.entryNumber,
      vote.entryName,
      vote.voterEmail,
      vote.voterName,
      countsFor(vote),
      vote.category,
      yesNo(vote.inPerson),
      yesNo(vote.sawInPerson),
      vote.locationCheck && LOCATION_CHECK_LABELS[vote.locationCheck],
      vote.location?.country,
      vote.location?.region,
      vote.location?.regionCode,
      vote.location?.city,
      vote.location?.latitude,
      vote.location?.longitude,
      vote.location?.timezone,
    ]
      .map(escapeCSV)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(content: string, name: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  link.href = url;
  link.download = `${name}-${stamp}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
