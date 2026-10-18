import { describe, expect, it } from "vitest";
import { escapeCSV, toCsv } from "./csv";

describe("escapeCSV", () => {
  it("quotes cells with commas, quotes and line breaks", () => {
    expect(escapeCSV("Smith, John")).toBe('"Smith, John"');
    expect(escapeCSV('The "Big" One')).toBe('"The ""Big"" One"');
    expect(escapeCSV("line\nbreak")).toBe('"line\nbreak"');
  });

  it("stops a spreadsheet running a cell as a formula", () => {
    expect(escapeCSV("=HYPERLINK(\"http://evil.example\")")).toBe(
      '"\'=HYPERLINK(""http://evil.example"")"',
    );
    expect(escapeCSV("+61 400 000 000")).toBe("'+61 400 000 000");
    expect(escapeCSV("-2+3")).toBe("'-2+3");
    expect(escapeCSV("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCSV("\t=1")).toBe("'\t=1");
    expect(escapeCSV("\r=1")).toBe("\"'\r=1\"");
  });

  it("leaves numbers and ordinary text alone", () => {
    expect(escapeCSV(-33.65)).toBe("-33.65");
    expect(escapeCSV(7)).toBe("7");
    expect(escapeCSV(true)).toBe("true");
    expect(escapeCSV("Twinkle Town")).toBe("Twinkle Town");
    expect(escapeCSV(undefined)).toBe("");
  });

  it("is used for every cell, headers included", () => {
    expect(toCsv(["Name"], [["=1+1"]])).toBe("Name\n'=1+1");
  });
});
