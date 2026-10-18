import { afterEach, describe, expect, it } from "vitest";
import { event } from "./event";
import { votingClosedMessage } from "./eventStatus";

describe("votingClosedMessage", () => {
  const voting = event.voting;
  afterEach(() => {
    event.voting = voting;
  });

  it("just says voting is closed until the dates are set", () => {
    event.voting = null;
    expect(votingClosedMessage(event.year)).toBe(
      `Voting for the ${event.year} competition is closed right now.`,
    );
  });

  it("gives the voting dates once they're set", () => {
    event.voting = { opens: "2026-12-04", closes: "2026-12-27" };
    expect(votingClosedMessage(event.year)).toContain(
      "Voting is open from Friday 4 December to Sunday 27 December.",
    );
    expect(votingClosedMessage(event.year + 1)).not.toContain("Voting is open");
  });
});
