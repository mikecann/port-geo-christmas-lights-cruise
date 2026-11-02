import { describe, expect, it } from "vitest";
import { collapseRuns } from "./numberState";

describe("collapseRuns", () => {
  it("turns runs into ranges and leaves single numbers alone", () => {
    expect(collapseRuns([2, 4, 6, 10, 11, 14, 15, 16, 17])).toBe(
      "2, 4, 6, 10–11, 14–17",
    );
  });

  it("handles one number and none", () => {
    expect(collapseRuns([5])).toBe("5");
    expect(collapseRuns([])).toBe("");
  });
});
