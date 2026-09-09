import { test, expect } from "@playwright/test";
import { hasCreds } from "./helpers";

/**
 * API-level tests using the authenticated storage-state context:
 * webhook endpoint, rate limiting, and unauthenticated access.
 */
test.describe("Webhook & API", () => {
  test("webhook POST to unknown workflow returns 404", async ({ request }) => {
    const res = await request.post("/api/webhooks/00000000-0000-0000-0000-000000000000", {
      data: { hello: "world" },
    });
    expect(res.status()).toBe(404);
  });

  test("webhook POST with wrong token returns 403", async ({ request, page }) => {
    test.skip(!hasCreds(), "E2E_EMAIL/E2E_PASSWORD not set");
    // Find a real webhook workflow via the authenticated app.
    await page.goto("/app");
    await page.waitForURL(/\/app\/[0-9a-f-]{36}/, { timeout: 30_000 });
    const wsId = page.url().match(/\/app\/([0-9a-f-]{36})/)?.[1];

    const listRes = await request.get(`/api/workflows?workspace_id=${wsId}`);
    expect(listRes.ok()).toBeTruthy();
    const { data: workflows } = await listRes.json();
    const wf = (workflows as { id: string; trigger_type: string }[]).find((w) => w.trigger_type === "webhook");
    if (!wf) {
      test.skip(true, "No webhook workflow in test workspace");
      return;
    }
    const res = await request.post(`/api/webhooks/${wf.id}?token=wrong-token`, { data: {} });
    expect(res.status()).toBe(403);
  });

  test("unauthenticated API access is rejected", async ({ browser }) =>
    (async () => {
      const ctx = await browser.newContext();
      const req = ctx.request;
      const res = await req.post("/api/workflows", {
        data: { workspace_id: "00000000-0000-0000-0000-000000000000", name: "x" },
      });
      expect([401, 403]).toContain(res.status());
      await ctx.close();
    })()
  );

  test("health endpoint is healthy", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.checks.database.status).toBe("ok");
  });
});
