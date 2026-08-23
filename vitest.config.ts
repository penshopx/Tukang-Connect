import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Each test file runs in its own context so vi.mock works cleanly
    isolate: true,
  },
});
