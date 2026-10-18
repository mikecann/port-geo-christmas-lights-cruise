import { describe, expect, it } from "vitest";
import { codeDigits } from "./signInCode";

describe("codeDigits", () => {
  it.each([
    ["123456", "123456"],
    ["123 456", "123456"],
    [" 12-34-56 ", "123456"],
    ["042917 is your Port Geographe Christmas Cruise sign-in code", "042917"],
    ["1234567", "123456"],
    ["12a", "12"],
    ["", ""],
  ])("turns %j into %j", (value, expected) => {
    expect(codeDigits(value)).toBe(expected);
  });
});
