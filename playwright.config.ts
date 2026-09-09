import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Load .env.local (and .env) into process.env so tests + the dev server
// share the same Supabase config. Values already set in the environment win.
for (const file of [".env.test", ".env.local", ".env"]) {
  const p = path.join(__dirname, file);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

/**
 * Playwright E2E config.
 *
 * Requires a running app + live Supabase:
 *   1. npm run dev          (or set BASE_URL to a deployed preview)
 *   2. Set env vars (Playwright reads .env or process env):
 *        E2E_BASE_URL        — default http://localhost:3000
 *        E2E_EMAIL           — test account email
 *        E2E_PASSWORD        — test account password
 *
 * Run:
 *   npx playwright test                 # all
 *   npx playwright test auth            # grep by filename
 *   npx playwright test --headed        # watch browser
 *   npx playwright show-report          # open HTML report
 */

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // Supabase free tier rate limits — run serially
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { baseURL },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Only load saved auth if the setup test produced it (i.e. credentials
        // were provided). Without it, tests run logged-out.
        storageState: fs.existsSync(path.join(__dirname, "tests/e2e/auth.json"))
          ? "tests/e2e/auth.json"
          : undefined,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // Only auto-starts if the app isn't already running.
    // Set CI=true to disable and rely on an existing server (e.g. CI preview).
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
