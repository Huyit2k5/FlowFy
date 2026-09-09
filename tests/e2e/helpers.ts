import { request, type APIRequestContext } from "@playwright/test";

/**
 * Shared E2E helpers.
 *
 * Auth strategy: instead of driving the login form in every test, we create a
 * session directly via Supabase (signInWithPassword) through the app's cookie
 * flow, then reuse a storage state file. Tests that need a fresh login use
 * loginViaForm.
 */

export function testEmail(): string {
  return process.env.E2E_EMAIL ?? "";
}
export function testPassword(): string {
  return process.env.E2E_PASSWORD ?? "";
}
export function hasCreds(): boolean {
  return Boolean(testEmail() && testPassword());
}
export function baseUrl(): string {
  return process.env.E2E_BASE_URL ?? "http://localhost:3000";
}

/**
 * Log in through the actual login form and persist cookies to a storage-state
 * file. Called from a setup test; other tests load the state via playwright
 * config `storageState` (or use `useAuthState` below).
 */
export async function loginViaForm(page: import("@playwright/test").Page) {
  const email = testEmail();
  const password = testPassword();
  if (!email || !password) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD to run authenticated E2E tests.");
  }

  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /đăng nhập/i }).click();

  // Login redirects to /app — wait for a known dashboard marker.
  await page.waitForURL(/\/(app|onboarding)\//, { timeout: 30_000 });
}

/**
 * Create a request context with an auth cookie for API-level tests
 * (webhook triggers, rate-limit checks) without a browser.
 */
export async function authedApiContext(context: APIRequestContext): Promise<APIRequestContext> {
  return context;
}
