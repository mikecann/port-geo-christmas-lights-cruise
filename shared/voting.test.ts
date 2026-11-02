import { describe, expect, it } from "vitest";
import { event, type EventFacts } from "./event";
import { perthDate, votingClosedCopy, votingPhase } from "./voting";

const withVoting = (voting: EventFacts["voting"]): EventFacts => ({
  ...event,
  voting,
});
const dates = withVoting({ opens: "2026-12-04", closes: "2026-12-27" });
// Midday in Perth (UTC+8) on the given day
const perthNoon = (date: string) => new Date(`${date}T04:00:00Z`);
const closed = { year: event.year, votingOpen: false };

describe("votingPhase", () => {
  it("is open whenever the switch is on", () => {
    expect(
      votingPhase({ year: event.year, votingOpen: true }, new Date(), null),
    ).toBe("open");
  });

  it("hasn't opened yet while the dates aren't set", () => {
    expect(votingPhase(closed, new Date(), withVoting(null))).toBe(
      "notOpenYet",
    );
  });

  it("tells before the dates from after them", () => {
    expect(votingPhase(closed, perthNoon("2026-11-02"), dates)).toBe(
      "notOpenYet",
    );
    // Opening day, before an admin flips the switch
    expect(votingPhase(closed, perthNoon("2026-12-04"), dates)).toBe(
      "notOpenYet",
    );
    expect(votingPhase(closed, perthNoon("2026-12-10"), dates)).toBe("paused");
    expect(votingPhase(closed, perthNoon("2026-12-27"), dates)).toBe(
      "finished",
    );
    expect(votingPhase(closed, perthNoon("2027-01-09"), dates)).toBe(
      "finished",
    );
  });

  it("counts any year without facts as a past one", () => {
    expect(
      votingPhase({ year: 2025, votingOpen: false }, new Date(), null),
    ).toBe("finished");
  });

  it("goes by the day in Perth, not UTC", () => {
    // 1am on 27 December in Perth is still 26 December in UTC
    expect(perthDate(new Date("2026-12-26T17:00:00Z"))).toBe("2026-12-27");
  });
});

describe("votingClosedCopy", () => {
  it("gives the dates when they're known", () => {
    expect(votingClosedCopy("notOpenYet", dates).detail).toBe(
      "It opens Friday 4 December and runs to Sunday 27 December.",
    );
    expect(votingClosedCopy("notOpenYet", withVoting(null)).title).toBe(
      "Voting hasn't opened yet",
    );
  });

  it("thanks people once it's over", () => {
    expect(votingClosedCopy("finished", null)).toEqual({
      title: "Voting has finished",
      detail: "Thanks to everyone who voted.",
    });
  });
});
