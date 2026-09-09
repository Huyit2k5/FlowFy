import { test, expect } from "@playwright/test";
import { hasCreds } from "./helpers";

/**
 * Workflow canvas: palette, add node, run.
 */
test.describe("Workflow canvas", () => {
  async function createAndOpenCanvas(page: import("@playwright/test").Page) {
    test.skip(!hasCreds(), "E2E_EMAIL/E2E_PASSWORD not set");
    await page.goto("/app");
    await page.waitForURL(/\/app\/[0-9a-f-]{36}/, { timeout: 30_000 });
    const wsId = page.url().match(/\/app\/([0-9a-f-]{36})/)?.[1];
    await page.goto(`/app/${wsId}/workflows`);

    await page.getByRole("button", { name: /tạo workflow/i }).click();
    await page.getByPlaceholder("VD: Báo cáo bán hàng hằng ngày").fill(`Canvas E2E ${Date.now()}`);
    await page.getByRole("button", { name: "Tạo", exact: true }).click();
    await page.waitForURL(/\/app\/[0-9a-f-]{36}\/workflows\/[0-9a-f-]{36}/, { timeout: 30_000 });
  }

  test("canvas renders palette with node types", async ({ page }) => {
    await createAndOpenCanvas(page);
    // Palette header
    await expect(page.getByText("Thêm node", { exact: false })).toBeVisible();
    // A basic node type is listed
    await expect(page.getByRole("button", { name: /trigger/i }).first()).toBeVisible();
  });

  test("adding a node shows it on canvas", async ({ page }) => {
    await createAndOpenCanvas(page);
    // Count React Flow nodes before
    const before = await page.locator(".react-flow__node").count();
    await page.getByRole("button", { name: /trigger/i }).first().click();
    const after = await page.locator(".react-flow__node").count();
    expect(after).toBeGreaterThan(before);
  });

  test("run button triggers a workflow run", async ({ page }) => {
    await createAndOpenCanvas(page);
    // Add a trigger node so the run button enables
    await page.getByRole("button", { name: /trigger/i }).first().click();
    await expect(page.locator(".react-flow__node").first()).toBeVisible();

    // Save then run
    await page.getByRole("button", { name: /lưu/i }).click();
    await page.getByRole("button", { name: /chạy/i }).click();

    // Run result or a status indicator appears (run completes or shows feedback)
    await expect(
      page.getByText(/thành công|lỗi|đang chạy|chạy xong/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
