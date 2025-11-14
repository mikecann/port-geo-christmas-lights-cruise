import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "e2e",
          testTimeout: 60000, // 60 seconds for e2e tests
          hookTimeout: 120000, // 2 minutes for setup/teardown
          include: ["e2e/**/*.test.ts"],
          maxConcurrency: 1,
        },
      },
      {
        extends: true,
        test: {
          name: "unit",
          environment: "edge-runtime",
          server: { deps: { inline: ["convex-test", "fluent-convex"] } },
          include: [
            "convex/**/*.test.ts",
            "shared/**/*.test.ts",
            "src/**/*.test.ts",
          ],
        },
      },
    ],
  },
});
