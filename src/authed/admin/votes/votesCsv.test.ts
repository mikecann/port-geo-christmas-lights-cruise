import { describe, expect, it } from "vitest";
import type { Id } from "../../../../convex/_generated/dataModel";
import { votesToCsv } from "./votesCsv";

const voteId = "v1" as Id<"votes">;

describe("votesToCsv", () => {
  it("includes the location columns and quotes awkward values", () => {
    const csv = votesToCsv([
      {
        _id: voteId,
        castAt: Date.UTC(2026, 11, 5, 11, 30),
        entryNumber: 26,
        entryName: 'The "Big" Display, Keel Retreat',
        voterEmail: "voter@example.com",
        voterName: "Voter",
        inPerson: false,
        sawInPerson: true,
        locationCheck: "outside_area",
        location: {
          country: "GB",
          region: "England",
          city: "London",
          latitude: 51.5,
          longitude: -0.12,
          timezone: "Europe/London",
          issuedAt: 0,
        },
      },
      {
        _id: voteId,
        castAt: Date.UTC(2025, 11, 20),
        entryNumber: 3,
        entryName: "Old Favourite",
        category: "most_jolly",
      },
    ]);
    const [headers, outside, legacy] = csv.split("\n");

    expect(headers).toContain("in person,ticked seen in person,location check");
    expect(headers).toContain("country,region,region code,city,latitude");
    expect(outside).toBe(
      '2026-12-05T11:30:00.000Z,26,"The ""Big"" Display, Keel Retreat",voter@example.com,Voter,People\'s Choice,,no,yes,Outside the area,GB,England,,London,51.5,-0.12,Europe/London',
    );
    expect(legacy).toBe(
      "2025-12-20T00:00:00.000Z,3,Old Favourite,,,2025 Most Jolly,most_jolly,,,,,,,,,,",
    );
  });
});
