import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import type { VoteCategory } from "../../convex/features/votes/schema";
import { VOTE_CATEGORY_NAMES } from "../../shared/voting";

// A quick word that a vote went through, at the top so it's clear of the bar
export function showVoteToast(
  category: VoteCategory,
  change: "sent" | "removed",
) {
  notifications.show({
    message: `${VOTE_CATEGORY_NAMES[category].title} vote ${change}`,
    color: change === "sent" ? "green" : "gray",
    icon: <IconCheck size={18} aria-hidden />,
    position: "top-center",
    autoClose: 2500,
    withCloseButton: false,
  });
}

// A vote tapped before signing in that wasn't sent once they were in, as the
// location check no longer passed. Said out loud, so they don't think it went
// in.
export function showVoteNotSentToast(category: VoteCategory) {
  notifications.show({
    title: "Your vote hasn't gone in",
    message:
      category === "most_jolly"
        ? "We couldn't confirm you're voting in person, which Most Jolly votes need. You can still vote for best display."
        : "We couldn't confirm you're voting in person. Tap Vote to count it for People's Choice instead.",
    color: "yellow",
    position: "top-center",
    autoClose: 8000,
  });
}
