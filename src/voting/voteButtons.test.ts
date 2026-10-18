import { describe, expect, it } from "vitest";
import type { VoteCategory } from "../../convex/features/votes/schema";
import type { MyVote, MyVotes } from "./useVoteFlow";
import { seenAnswerFromVotes, voteButtonStatus } from "./voteButtons";

const voteFor = (entryId: string, category: VoteCategory, sawInPerson = true) =>
  ({
    _id: `vote-${entryId}-${category}`,
    category,
    entry: { _id: entryId },
    sawInPerson,
  }) as MyVote;
const noVotes: MyVotes = { best_display: null, most_jolly: null };
const votes = (partial: Partial<MyVotes>): MyVotes => ({
  ...noVotes,
  ...partial,
});

describe("voteButtonStatus", () => {
  it("is a new vote without one in that category", () => {
    expect(voteButtonStatus(null, "best_display", "entry1", null, null)).toBe(
      "vote",
    );
    const jollyHere = votes({ most_jolly: voteFor("entry1", "most_jolly") });
    expect(
      voteButtonStatus(jollyHere, "best_display", "entry1", true, true),
    ).toBe("vote");
  });

  it("shows a vote on this entry as voted", () => {
    const here = votes({
      best_display: voteFor("entry1", "best_display"),
      most_jolly: voteFor("entry1", "most_jolly"),
    });
    expect(voteButtonStatus(here, "best_display", "entry1", true, true)).toBe(
      "voted",
    );
    expect(voteButtonStatus(here, "most_jolly", "entry1", true, true)).toBe(
      "voted",
    );
  });

  it("moves a vote that's on another entry", () => {
    const elsewhere = votes({ most_jolly: voteFor("entry2", "most_jolly") });
    expect(
      voteButtonStatus(elsewhere, "most_jolly", "entry1", true, true),
    ).toBe("move");
  });

  it("updates a best display vote when they change their seen-it answer", () => {
    const notSeen = votes({
      best_display: voteFor("entry1", "best_display", false),
    });
    expect(
      voteButtonStatus(notSeen, "best_display", "entry1", true, true),
    ).toBe("update");
    expect(
      voteButtonStatus(notSeen, "best_display", "entry1", false, true),
    ).toBe("voted");
  });

  it("keeps it voted when the switch isn't there or isn't answered", () => {
    const seen = votes({ best_display: voteFor("entry1", "best_display") });
    expect(voteButtonStatus(seen, "best_display", "entry1", null, true)).toBe(
      "voted",
    );
    // The location check failing later doesn't ask them to downgrade it
    expect(voteButtonStatus(seen, "best_display", "entry1", null, false)).toBe(
      "voted",
    );
  });
});

describe("seenAnswerFromVotes", () => {
  it("is seen with a Most Jolly vote here", () => {
    const here = votes({
      best_display: voteFor("entry1", "best_display", false),
      most_jolly: voteFor("entry1", "most_jolly"),
    });
    expect(seenAnswerFromVotes(here, "entry1")).toBe(true);
  });

  it("is what their best display vote here was sent with", () => {
    const notSeen = votes({
      best_display: voteFor("entry1", "best_display", false),
    });
    expect(seenAnswerFromVotes(notSeen, "entry1")).toBe(false);
  });

  it("is unanswered without a vote here", () => {
    const elsewhere = votes({
      best_display: voteFor("entry2", "best_display"),
      most_jolly: voteFor("entry2", "most_jolly"),
    });
    expect(seenAnswerFromVotes(elsewhere, "entry1")).toBe(null);
    expect(seenAnswerFromVotes(null, "entry1")).toBe(null);
  });
});
