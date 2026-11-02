import { event, type Sailing } from "../../shared/event";
import { perthDate } from "../../shared/voting";

// What the home page leads with. While entries are the news, the competition
// comes first; once the cruises start (or voting opens), people want to vote,
// find the displays and book a cruise, so that comes first instead.
export type HomeSeason = "entries" | "cruises";

export function homeSeason(
  competition: { votingOpen: boolean } | undefined,
  now: Date = new Date(),
  sailings: Sailing[] = event.cruise.sailings,
): HomeSeason {
  if (competition?.votingOpen) return "cruises";
  const firstSailing = sailings[0]?.date;
  if (firstSailing && perthDate(now) >= firstSailing) return "cruises";
  return "entries";
}
