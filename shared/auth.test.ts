import { describe, expect, it } from "vitest";
import { canonicalEmail, normalizeEmail } from "./auth";

describe("normalizeEmail", () => {
  it("ignores case and surrounding spaces", () => {
    expect(normalizeEmail(" ZOliver@AigleRoyal.com.au ")).toBe(
      "zoliver@aigleroyal.com.au",
    );
  });
});

describe("canonicalEmail", () => {
  it("gives every spelling of one Gmail inbox the same email", () => {
    for (const address of [
      "john.smith@gmail.com",
      "JohnSmith@Gmail.com",
      "j.o.h.n.smith+cruise@gmail.com",
      " john.smith+vote2@googlemail.com ",
    ])
      expect(canonicalEmail(address)).toBe("johnsmith@gmail.com");
  });

  it("drops a +tag for any provider but keeps their dots", () => {
    expect(canonicalEmail("Jane.Doe+lights@Outlook.com")).toBe(
      "jane.doe@outlook.com",
    );
    expect(canonicalEmail("jane.doe@outlook.com")).not.toBe(
      canonicalEmail("janedoe@outlook.com"),
    );
  });

  it("copes with odd addresses", () => {
    expect(canonicalEmail("+tag@example.com")).toBe("+tag@example.com");
    expect(canonicalEmail("...@gmail.com")).toBe("...@gmail.com");
    expect(canonicalEmail("not-an-email")).toBe("not-an-email");
  });
});
