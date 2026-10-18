import { eventForYear, formatDate } from "./event";

export function votingClosedMessage(year: number) {
  const voting = eventForYear(year)?.voting;
  const closed = `Voting for the ${year} competition is closed right now.`;
  if (!voting) return closed;
  return `${closed} Voting is open from ${formatDate(voting.opens)} to ${formatDate(voting.closes)}.`;
}
