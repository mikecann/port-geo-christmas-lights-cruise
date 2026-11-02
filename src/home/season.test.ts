import { describe, expect, it } from "vitest";
import { homeSeason } from "./season";

const sailings = [{ date: "2026-12-04", times: ["7:30pm"] }];

describe("homeSeason", () => {
  it("leads with entries before the cruises start", () => {
    expect(
      homeSeason(
        { votingOpen: false },
        new Date("2026-11-20T04:00:00Z"),
        sailings,
      ),
    ).toBe("entries");
  });

  it("switches to the cruises on the first sailing day in Perth", () => {
    // 4 Dec 00:30 in Perth is still 3 Dec in UTC
    expect(
      homeSeason(
        { votingOpen: false },
        new Date("2026-12-03T16:30:00Z"),
        sailings,
      ),
    ).toBe("cruises");
  });

  it("leads with the cruises whenever voting is open", () => {
    expect(
      homeSeason(
        { votingOpen: true },
        new Date("2026-11-01T00:00:00Z"),
        sailings,
      ),
    ).toBe("cruises");
  });

  it("assumes entries while the competition is loading, before the cruises", () => {
    expect(
      homeSeason(undefined, new Date("2026-11-20T04:00:00Z"), sailings),
    ).toBe("entries");
  });
});
