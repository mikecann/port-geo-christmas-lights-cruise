import type {
  LocationCheck,
  VoteCategory,
} from "../convex/features/votes/schema";
import { eventForYear, formatDate, type EventFacts } from "./event";

// What the vote pages call each category. Most Jolly is a prize's name (the
// "Most Jolly Award" on the competition page), so it keeps its capitals even
// mid-sentence, where best display doesn't. The schema's own titles are left
// alone as other code may lean on them.
export const VOTE_CATEGORY_NAMES: Record<
  VoteCategory,
  { title: string; inSentence: string }
> = {
  best_display: { title: "Best display", inSentence: "best display" },
  most_jolly: { title: "Most Jolly", inSentence: "Most Jolly" },
};

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

// Why voting isn't open, so a page can say "not yet" before it starts and
// "it's over" after, rather than "closed" for both. Paused is between the
// dates with voting switched off (opening late, or closed early).
export type VotingPhase = "open" | "notOpenYet" | "paused" | "finished";

// Today in Port Geographe, as YYYY-MM-DD, so it compares with the event dates
export const perthDate = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export function votingPhase(
  competition: { year: number; votingOpen: boolean },
  now: Date = new Date(),
  facts: EventFacts | null = eventForYear(competition.year),
): VotingPhase {
  if (competition.votingOpen) return "open";
  // Only this year's facts are kept, so any other year's is a past one
  if (!facts) return "finished";
  // The dates are set before voting opens, so none yet means it hasn't
  if (!facts.voting) return "notOpenYet";
  const today = perthDate(now);
  if (today <= facts.voting.opens) return "notOpenYet";
  if (today >= facts.voting.closes) return "finished";
  return "paused";
}

// A heading and one kind line for when voting isn't open
export function votingClosedCopy(
  phase: Exclude<VotingPhase, "open">,
  facts: EventFacts | null,
): { title: string; detail: string } {
  const voting = facts?.voting;
  if (phase === "notOpenYet")
    return {
      title: "Voting hasn't opened yet",
      detail: voting
        ? `It opens ${formatDate(voting.opens)} and runs to ${formatDate(voting.closes)}.`
        : "Check back once the lights are on.",
    };
  if (phase === "paused")
    return {
      title: "Voting is paused",
      detail: "It'll be back soon. Thanks for your patience.",
    };
  return {
    title: "Voting has finished",
    detail: facts?.winnersPresentation
      ? `Thanks to everyone who voted. The winners are announced ${formatDate(facts.winnersPresentation)}.`
      : "Thanks to everyone who voted.",
  };
}
