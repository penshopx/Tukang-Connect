import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Each test file runs in its own context so vi.mock works cleanly
    isolate: true,
    // Only run source tests; exclude compiled output so dist/ duplicates
    // don't inflate the suite or drift from the TypeScript originals.
    exclude: ["dist/**", "node_modules/**"],
  },
});
