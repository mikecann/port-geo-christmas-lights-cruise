import { describe, expect, it } from "vitest";
import {
  cruiseDateRange,
  cruiseTimeGroups,
  event,
  eventForYear,
  formatAward,
  formatDate,
  prizeTotal,
} from "./event";

describe("event facts", () => {
  it("prizes add up to the prize pool", () => {
    expect(prizeTotal(event.prizes)).toBe(event.prizePool);
  });

  it("sailings are in date order", () => {
    const dates = event.cruise.sailings.map((s) => s.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("only apply to their own year", () => {
    expect(eventForYear(event.year)).toBe(event);
    expect(eventForYear(event.year + 1)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats dates with the weekday", () => {
    expect(formatDate("2026-12-04")).toBe("Friday 4 December");
    expect(formatDate("2026-11-29", true)).toBe("Sun 29 Nov");
  });

  it("formats awards", () => {
    expect(formatAward({ label: "1st", amount: 5000 })).toBe("1st $5,000");
    expect(formatAward({ count: 6, amount: 1000 })).toBe("6 x $1,000");
    expect(formatAward({ amount: 3000 })).toBe("$3,000");
  });

  it("gives the cruise date range", () => {
    expect(cruiseDateRange(event.cruise.sailings)).toBe("4 to 24 December");
    expect(
      cruiseDateRange([
        { date: "2026-11-30", times: [] },
        { date: "2026-12-02", times: [] },
      ]),
    ).toBe("30 November to 2 December");
    expect(cruiseDateRange([])).toBeNull();
  });

  it("groups runs of nights with the same times", () => {
    expect(
      cruiseTimeGroups([
        { date: "2026-12-04", times: ["7:30pm"] },
        { date: "2026-12-05", times: ["7:30pm"] },
        { date: "2026-12-17", times: ["7:30pm", "8:30pm"] },
        { date: "2026-12-24", times: ["7:30pm"] },
      ]),
    ).toEqual([
      { times: "7:30pm", dates: ["2026-12-04", "2026-12-05"] },
      { times: "7:30pm and 8:30pm", dates: ["2026-12-17"] },
      { times: "7:30pm", dates: ["2026-12-24"] },
    ]);
  });
});
