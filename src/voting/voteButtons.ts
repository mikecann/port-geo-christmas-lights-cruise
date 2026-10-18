// What each vote button on an entry's page does, from their votes and their
// "seen it in person?" answer
import type { VoteCategory } from "../../convex/features/votes/schema";
import type { MyVotes } from "./useVoteFlow";

// vote: a new vote. voted: it's on this entry, so a tap offers to remove it.
// update: it's on this entry but their seen-it answer changed. move: it's on
// another entry, so a tap asks before moving it.
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
  // Only an answer they gave on the switch changes which prize it counts for
  const answerChanged =
    inPersonAllowed === true &&
    sawInPerson !== null &&
    vote.sawInPerson !== sawInPerson;
  return answerChanged ? "update" : "voted";
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
