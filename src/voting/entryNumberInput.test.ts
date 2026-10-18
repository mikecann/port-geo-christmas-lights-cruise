import { describe, expect, it } from "vitest";
import { deleteDigit, typeDigit } from "./entryNumberInput";

describe("entry number keypad", () => {
  it("adds digits up to four", () => {
    expect(typeDigit("", "2")).toBe("2");
    expect(typeDigit("2", "6")).toBe("26");
    expect(typeDigit("1234", "5")).toBe("1234");
  });

  it("drops leading zeros but allows a lone zero", () => {
    expect(typeDigit("", "0")).toBe("0");
    expect(typeDigit("0", "0")).toBe("0");
    expect(typeDigit("0", "7")).toBe("7");
  });

  it("deletes the last digit", () => {
    expect(deleteDigit("26")).toBe("2");
    expect(deleteDigit("")).toBe("");
  });
});
