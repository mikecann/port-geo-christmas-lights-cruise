import { describe, expect, it } from "vitest";
import { voteBulbColors } from "./bulbs";

describe("voteBulbColors", () => {
  it("runs through all the colours for best display", () => {
    expect(voteBulbColors("best_display")).toEqual([
      "red-6",
      "green-6",
      "yellow-5",
      "blue-5",
      "red-6",
      "green-6",
      "yellow-5",
      "blue-5",
      "red-6",
    ]);
  });

  it("alternates red and green for most jolly", () => {
    const colors = voteBulbColors("most_jolly");
    expect(colors).toHaveLength(9);
    colors.forEach((color, i) =>
      expect(color).toBe(i % 2 === 0 ? "red-6" : "green-6"),
    );
  });
});
