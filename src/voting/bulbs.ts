import type { VoteCategory } from "../../convex/features/votes/schema";

// Mantine colours for strings of Christmas lights, in order along the string
export const BULB_COLORS = ["red-6", "green-6", "yellow-5", "blue-5"];

// Most jolly gets the old red and green
const JOLLY_COLORS = ["red-6", "green-6"];

const VOTE_BULB_COUNT = 9;

// How long a vote that's just gone in lights up its button, a little over the
// CSS so the last bulb has faded before the string goes
export const VOTE_LIGHTS_MS = 1250;

// The bulbs along the top of a vote button, left to right
export const voteBulbColors = (category: VoteCategory) => {
  const colors = category === "most_jolly" ? JOLLY_COLORS : BULB_COLORS;
  return Array.from(
    { length: VOTE_BULB_COUNT },
    (_, i) => colors[i % colors.length],
  );
};
