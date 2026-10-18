import type {
  LocationCheck,
  VoteCategory,
} from "../convex/features/votes/schema";

// Shown by the greyed out vote button, and by the vote mutation if the answer
// is missing
export const SEEN_IN_PERSON_REQUIRED_MESSAGE =
  "Tell us whether you've seen it in person first.";

// When an in-person vote comes without a fresh location token, from either
// end, as storing it would put it in People's Choice
export const LOCATION_RETRY_MESSAGE =
  "We couldn't confirm your location. Please try again.";

// Most Jolly is about the dancing and dressing up, so only people who were
// there can vote for it
export const MOST_JOLLY_IN_PERSON_MESSAGE =
  "Most Jolly votes are just for displays you've seen in person. You can still vote for best display.";

// The prize a 2026 vote counts for
export const awardName = (vote: {
  category: VoteCategory;
  inPerson: boolean;
}) => {
  if (vote.category === "most_jolly") return "Most Jolly";
  return vote.inPerson ? "In-Person Favourites" : "People's Choice";
};

export type InPersonAreaSummary = { countries: string[]; waOnly: boolean };

const areaName = (area: InPersonAreaSummary) => {
  if (area.waOnly) return "Western Australia";
  if (area.countries.length === 1 && area.countries[0] === "AU")
    return "Australia";
  return "the area for in-person votes";
};

// Why a vote can only count for People's Choice, in plain words. null when
// the location check passed, so their "I've seen it" answer decides.
export function peoplesChoiceOnlyReason(
  locationCheck: LocationCheck,
  area: InPersonAreaSummary,
): string | null {
  if (locationCheck === "ok") return null;
  if (locationCheck === "not_configured")
    return "In-person voting isn't switched on right now, so votes count for People's Choice only.";
  if (locationCheck === "outside_area")
    return `Your internet connection looks like it's outside ${areaName(area)}, so your vote will count for People's Choice only.`;
  return "We couldn't check where you're voting from, so your vote will count for People's Choice only.";
}
