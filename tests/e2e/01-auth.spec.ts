import { test, expect } from "@playwright/test";
import { testEmail, testPassword, loginViaForm } from "./helpers";

test.describe("Auth", () => {
  test("login page renders email + password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /đăng nhập/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /đăng nhập/i })).toBeEnabled();
  });

  test("register page renders and links to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /tạo tài khoản/i })).toBeVisible();
    await expect(page.getByPlaceholder("Nguyễn Văn A")).toBeVisible();
    await expect(page.getByRole("link", { name: /đăng nhập/i })).toBeVisible();
  });

  test("wrong password shows error, does not log in", async ({ page }) => {
    if (!testEmail()) test.skip(true, "E2E_EMAIL not set");
    await page.goto("/login");
    await page.getByPlaceholder("you@company.com").fill(testEmail());
    await page.getByPlaceholder("••••••••").fill("wrong-password-123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    // Should stay on /login and show an error message
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/mật khẩu không chính xác|thất bại/i)).toBeVisible({ timeout: 15_000 });
  });

  test("empty login shows validation (no crash)", async ({ page }) => {
    await page.goto("/login");
    // Both inputs are `required` — clicking submit with empty fields stays on page
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("authenticated session persists across reload", async ({ page }) => {
    if (!testEmail() || !testPassword()) test.skip(true, "E2E_EMAIL/E2E_PASSWORD not set");
    const onApp = page.url().includes("/app/");
    if (!onApp) {
      await loginViaForm(page);
    }
    const url = page.url();
    await page.reload();
    // Still authenticated — not bounced to /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
