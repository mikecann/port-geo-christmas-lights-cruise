import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import {
  VOTE_CATEGORY_DETAILS,
  type VoteCategory,
} from "../../convex/features/votes/schema";

// A quick word that a vote went through, at the top so it's clear of the bar
export function showVoteToast(
  category: VoteCategory,
  change: "sent" | "removed",
) {
  notifications.show({
    message: `${VOTE_CATEGORY_DETAILS[category].title} vote ${change}`,
    color: change === "sent" ? "green" : "gray",
    icon: <IconCheck size={18} aria-hidden />,
    position: "top-center",
    autoClose: 2500,
    withCloseButton: false,
  });
}
