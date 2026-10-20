import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../_generated/dataModel";
import { email, escapeHtml } from "./model";
import { event } from "../../../shared/event";

const entry = {
  _id: "entry" as Id<"entries">,
  state: {
    kind: "submitting",
    name: "Twinkle Town",
    houseAddress: { address: "1 Keel Retreat", placeId: "pid" },
  },
} as Doc<"entries">;

const competition = { year: 2027 } as Doc<"competitions">;

describe("escapeHtml", () => {
  it("escapes markup in user written text", () => {
    expect(escapeHtml(`<a href="https://evil.example">Click</a> & 'win'`)).toBe(
      "&lt;a href=&quot;https://evil.example&quot;&gt;Click&lt;/a&gt; &amp; &#039;win&#039;",
    );
  });

  it("turns missing values into an empty string", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("entry emails", () => {
  it("link to the my-entries page", () => {
    expect(
      email.approvalHtml({ entry, entryNumber: 7, competition }),
    ).toContain('href="/my-entries"');
    expect(
      email.rejectionHtml({ entry, rejectedReason: "Outside the area" }),
    ).toContain('href="/my-entries"');
  });

  it("don't give last year's sign pickup details", () => {
    const html = email.approvalHtml({ entry, entryNumber: 7, competition });
    expect(html).toContain("sign collection details separately");
    expect(html).not.toContain("35 Keel Retreat");
    expect(html).not.toContain("Sunday 30th");
  });

  it("give this year's cruise times, and leave sign collection for later while it's unconfirmed", () => {
    const html = email.approvalHtml({
      entry,
      entryNumber: 7,
      competition: { year: event.year } as Doc<"competitions">,
    });
    expect(event.signCollection).toBeNull();
    expect(html).toContain("sign collection details separately");
    expect(html).not.toContain("35 Keel Retreat");
    expect(html).toContain("first cruise on Friday 4 December");
    expect(html).toContain("7:30pm and 8:30pm: Thu 17 Dec");
    expect(html).toContain('href="/tickets"');
  });

  it("give the sign collection once it's confirmed", () => {
    const { signCollection } = event;
    event.signCollection = {
      from: "2026-11-29",
      to: "2026-12-04",
      place: "35 Keel Retreat",
    };
    try {
      const html = email.approvalHtml({
        entry,
        entryNumber: 7,
        competition: { year: event.year } as Doc<"competitions">,
      });
      expect(html).toContain(
        "collect it from Sunday 29 November to Friday 4 December at 35 Keel Retreat",
      );
      expect(html).not.toContain("sign collection details separately");
    } finally {
      event.signCollection = signCollection;
    }
  });

  it("give the cruise month for the entry's competition year", () => {
    expect(
      email.approvalHtml({ entry, entryNumber: 7, competition }),
    ).toContain("cruise dates in December 2027");
  });
});

describe("sign-in code email", () => {
  it("shows the code and how long it lasts", () => {
    const html = email.signInCodeHtml({ code: "042917" });
    expect(html).toContain(">042917<");
    expect(html).toContain("10 minutes");
  });
});
