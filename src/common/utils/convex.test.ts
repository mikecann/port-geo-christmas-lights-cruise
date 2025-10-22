import { describe, it, expect } from "vitest";
import { getConvexDeploymentName } from "./convex";

describe("getConvexDeploymentName", () => {
  it("extracts name from @https URL", () => {
    expect(
      getConvexDeploymentName("@https://blessed-meadowlark-989.convex.cloud"),
    ).toBe("blessed-meadowlark-989");
  });

  it("extracts name from https URL without @", () => {
    expect(
      getConvexDeploymentName("https://blessed-meadowlark-989.convex.cloud"),
    ).toBe("blessed-meadowlark-989");
  });

  it("extracts name from bare hostname", () => {
    expect(getConvexDeploymentName("blessed-meadowlark-989.convex.cloud")).toBe(
      "blessed-meadowlark-989",
    );
  });

  it("handles URL with path and query", () => {
    expect(
      getConvexDeploymentName(
        "https://blessed-meadowlark-989.convex.cloud/app?x=1",
      ),
    ).toBe("blessed-meadowlark-989");
  });

  it("is case-insensitive for hostname", () => {
    expect(
      getConvexDeploymentName("HTTPS://BLESSED-MEADOWLARK-989.CONVEX.CLOUD"),
    ).toBe("blessed-meadowlark-989");
  });

  it("returns null for non-convex domains", () => {
    expect(getConvexDeploymentName("https://example.com")).toBeNull();
  });

  it("returns null for lookalike domains", () => {
    expect(
      getConvexDeploymentName("https://abc.convex.cloud.evil.com"),
    ).toBeNull();
  });

  it("returns null for invalid strings", () => {
    expect(getConvexDeploymentName("")).toBeNull();
    expect(getConvexDeploymentName("   ")).toBeNull();
    expect(getConvexDeploymentName("not a url")).toBeNull();
  });
});
