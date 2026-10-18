import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import type {
  LocationCheck,
  VoterLocation,
} from "../../../../convex/features/votes/schema";
import { VOTE_CATEGORY_DETAILS } from "../../../../convex/features/votes/schema";
import { toCsv } from "../../../common/utils/csv";

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
  reused: "Location used twice",
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
  const rows = votes.map((vote) => [
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
  ]);
  return toCsv(headers, rows);
}
