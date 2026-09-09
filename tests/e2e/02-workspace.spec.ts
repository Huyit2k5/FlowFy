import { test, expect } from "@playwright/test";
import { hasCreds } from "./helpers";

/**
 * Workspace dashboard.
 * Relies on the storage-state user having at least one workspace.
 * Navigates directly to /app (client resolves the workspace via layout).
 */
test.describe("Workspace dashboard", () => {
  test("dashboard shows overview heading + stats", async ({ page }) => {
    test.skip(!hasCreds(), "E2E_EMAIL/E2E_PASSWORD not set");
    await page.goto("/app");
    // Layout routes to the first workspace → /app/:id
    await page.waitForURL(/\/app\/[0-9a-f-]{36}/, { timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();
    await expect(page.locator("#dashboard-stats")).toBeVisible();
    await expect(page.locator("#create-workflow-btn")).toBeVisible();
  });

  test("dashboard stats grid renders 4 cards", async ({ page }) => {
    test.skip(!hasCreds(), "E2E_EMAIL/E2E_PASSWORD not set");
    await page.goto("/app");
    await page.waitForURL(/\/app\/[0-9a-f-]{36}/, { timeout: 30_000 });
    const statCards = page.locator("#dashboard-stats > div");
    await expect(statCards).toHaveCount(4);
  });

  test("create-workflow button navigates to workflows list", async ({ page }) => {
    test.skip(!hasCreds(), "E2E_EMAIL/E2E_PASSWORD not set");
    await page.goto("/app");
    await page.waitForURL(/\/app\/[0-9a-f-]{36}/, { timeout: 30_000 });
    await page.locator("#create-workflow-btn").click();
    await expect(page).toHaveURL(/\/app\/[0-9a-f-]{36}\/workflows$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
  });
});
