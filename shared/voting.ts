import type { LocationCheck } from "../convex/features/votes/schema";

export type InPersonAreaSummary = { countries: string[]; waOnly: boolean };

const areaName = (area: InPersonAreaSummary) => {
  if (area.waOnly) return "Western Australia";
  if (area.countries.length === 1 && area.countries[0] === "AU")
    return "Australia";
  return "the area for in-person votes";
};

// Why a vote can only count for People's Choice, in plain words. null when
// the location check passed, so the honesty tick decides.
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
