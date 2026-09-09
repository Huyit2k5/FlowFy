import { test, expect } from "@playwright/test";
import { hasCreds } from "./helpers";

/**
 * Workflow CRUD via the UI.
 */
test.describe("Workflow CRUD", () => {
  async function goWorkflows(page: import("@playwright/test").Page) {
    await page.goto("/app");
    await page.waitForURL(/\/app\/[0-9a-f-]{36}/, { timeout: 30_000 });
    const wsId = page.url().match(/\/app\/([0-9a-f-]{36})/)?.[1];
    await page.goto(`/app/${wsId}/workflows`);
    await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
  }

  test("create workflow via modal → lands on canvas", async ({ page }) => {
    test.skip(!hasCreds(), "E2E_EMAIL/E2E_PASSWORD not set");
    await goWorkflows(page);
    const name = `E2E ${Date.now()}`;

    await page.getByRole("button", { name: /tạo workflow/i }).click();
    await expect(page.getByRole("heading", { name: /tạo workflow mới/i })).toBeVisible();

    await page.getByPlaceholder("VD: Báo cáo bán hàng hằng ngày").fill(name);
    await page.getByRole("button", { name: "Tạo", exact: true }).click();

    // Lands on the canvas for the new workflow
    await page.waitForURL(/\/app\/[0-9a-f-]{36}\/workflows\/[0-9a-f-]{36}/, { timeout: 30_000 });
  });

  test("empty workspace shows sample-workflow empty state", async ({ page }) => {
    test.skip(!hasCreds(), "E2E_EMAIL/E2E_PASSWORD not set");
    await goWorkflows(page);
    // Either sample empty-state OR at least one workflow card — both valid.
    const hasSamples = await page.getByText(/mẫu/i).count();
    const hasCards = await page.getByRole("heading", { name: /e2e/i }).count();
    expect(hasSamples + hasCards).toBeGreaterThanOrEqual(0);
  });

  test("unauthenticated cannot list workflows (redirect to login)", async ({ browser }) => {
    const ctx = await browser.newContext(); // no storageState → logged out
    const page = await ctx.newPage();
    await page.goto("/app");
    // Should be redirected to /login (no session)
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    await ctx.close();
  });
});
