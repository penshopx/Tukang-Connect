import { defineConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:5000";

function resolveChromiumExecutable(): string | undefined {
  const configuredPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  try {
    return execFileSync("which", ["chromium"], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

const chromiumExecutablePath = resolveChromiumExecutable();

export default defineConfig({
  testDir: "./client/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: chromiumExecutablePath
      ? { executablePath: chromiumExecutablePath }
      : undefined,
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});