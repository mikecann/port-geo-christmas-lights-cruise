// What each vote button on an entry's page does, from their votes and their
// "seen it in person?" answer
import type { VoteCategory } from "../../convex/features/votes/schema";
import type { MyVotes } from "./useVoteFlow";

// vote: a new vote. voted: it's on this entry, so a tap offers to remove it.
// update: it's on this entry but would count for the other prize if sent now.
// move: it's on another entry, so a tap asks before moving it.
export type VoteButtonStatus = "vote" | "voted" | "update" | "move";

export function voteButtonStatus(
  votes: MyVotes | null,
  category: VoteCategory,
  entryId: string,
  sawInPerson: boolean | null,
  inPersonAllowed: boolean | null,
): VoteButtonStatus {
  const vote = votes?.[category];
  if (!vote) return "vote";
  if (vote.entry._id !== entryId) return "move";
  // Only an answer they gave on the switch changes which prize it counts for.
  // Compared with where it was counted, not what they said, so one that
  // landed in People's Choice after a failed location check can be resent.
  const prizeChanged =
    inPersonAllowed === true &&
    sawInPerson !== null &&
    vote.inPerson !== sawInPerson;
  return prizeChanged ? "update" : "voted";
}

// What a vote is sent with, or null when it would be in person but no fresh
// location token could be had, as the vote would then be turned down
export function voteToSend(
  answer: boolean | null,
  inPersonAllowed: boolean | null,
  geoToken: string | null,
): { sawInPerson: boolean | undefined; geoToken: string | undefined } | null {
  // Only asked once the location check passes. Otherwise it can't be in
  // person, so it goes as "not seen".
  const sawInPerson = inPersonAllowed ? (answer ?? undefined) : false;
  if (sawInPerson === true && geoToken === null) return null;
  return { sawInPerson, geoToken: geoToken ?? undefined };
}

// The seen-it answer their votes on this entry were sent with, so coming back
// to it shows the same buttons. Most Jolly is only taken from people who've
// seen it.
export function seenAnswerFromVotes(
  votes: MyVotes | null,
  entryId: string,
): boolean | null {
  if (votes?.most_jolly?.entry._id === entryId) return true;
  const bestDisplay = votes?.best_display;
  return bestDisplay?.entry._id === entryId ? bestDisplay.sawInPerson : null;
}
