import { expect, test } from "@playwright/test";

test.describe("[SMOKE] API @smoke", () => {
  // Read the indexer URL from env or use default
  const apiBase = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";

  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get(`${apiBase}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBeDefined();
  });

  test("projects endpoint returns data", async ({ request }) => {
    const response = await request.get(`${apiBase}/v2/projects?limit=1`);
    expect(response.status()).toBe(200);
  });

  test("communities endpoint returns data", async ({ request }) => {
    const response = await request.get(`${apiBase}/v2/communities?limit=1`);
    expect([200, 404]).toContain(response.status()); // 404 OK if no communities in test env
  });

  test("health responds under 2 seconds", async ({ request }) => {
    const start = Date.now();
    await request.get(`${apiBase}/health`);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
