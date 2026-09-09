import { test as setup, expect } from "@playwright/test";
import { loginViaForm, testEmail, testPassword } from "./helpers";

/**
 * Auth setup: logs in once via the form, saves cookies to auth.json.
 * Other test files load this via `test.use({ storageState: "tests/e2e/auth.json" })`.
 */
setup("authenticate", async ({ page }) => {
  if (!testEmail() || !testPassword()) {
    // Skip if no credentials configured (e.g. fresh clone without .env).
    setup.skip(true, "E2E_EMAIL / E2E_PASSWORD not set");
    return;
  }

  await loginViaForm(page);

  // After login we should be on a dashboard (has stats) or onboarding.
  await expect(page.locator("h1")).toBeVisible();

  await page.context().storageState({ path: "tests/e2e/auth.json" });
});
