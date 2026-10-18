import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../_generated/dataModel";
import { email, escapeHtml } from "./model";

const entry = {
  _id: "entry" as Id<"entries">,
  name: "Twinkle Town",
  houseAddress: { address: "1 Keel Retreat", placeId: "pid" },
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

  it("give the cruise month for the entry's competition year", () => {
    expect(
      email.approvalHtml({ entry, entryNumber: 7, competition }),
    ).toContain("cruise dates in December 2027");
  });
});
