import { IconAward, IconMoodSmile } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { VoteCategory } from "../../convex/features/votes/schema";

export const VOTE_CATEGORY_STYLES: Record<
  VoteCategory,
  { Icon: Icon; color: string }
> = {
  best_display: { Icon: IconAward, color: "blue" },
  most_jolly: { Icon: IconMoodSmile, color: "grape" },
};
