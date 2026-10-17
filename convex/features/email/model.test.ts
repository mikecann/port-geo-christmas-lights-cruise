import { describe, expect, it } from "vitest";
import { escapeHtml } from "./model";

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
