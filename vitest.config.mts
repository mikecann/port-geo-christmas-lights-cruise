import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "edge-runtime",
          server: { deps: { inline: ["convex-test"] } },
          include: [
            "convex/**/*.test.ts",
            "shared/**/*.test.ts",
            "src/**/*.test.ts",
            "worker/**/*.test.ts",
          ],
        },
      },
    ],
  },
});
