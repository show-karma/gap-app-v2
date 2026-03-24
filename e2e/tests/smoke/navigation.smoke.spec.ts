import { expect, test } from "@playwright/test";

test.describe("[SMOKE] Navigation @smoke", () => {
  const publicPages = ["/", "/projects", "/communities"];

  for (const path of publicPages) {
    test(`${path} loads without 5xx error`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
    });
  }

  test("404 page shows for nonexistent route", async ({ page }) => {
    await page.goto("/nonexistent-page-xyz-12345");
    // Should show something (not blank)
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(0);
  });

  test("has valid meta tags", async ({ page }) => {
    await page.goto("/");
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
  });
});
