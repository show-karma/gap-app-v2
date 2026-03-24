import { expect, test } from "@playwright/test";

test.describe("[SMOKE] Health Checks @smoke", () => {
  test("homepage loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    // Verify page has content (not blank)
    await expect(page.locator("main").first()).toBeVisible();

    // Filter out expected framework warnings
    const criticalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("hydration")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("projects page loads", async ({ page }) => {
    const response = await page.goto("/projects");
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("communities page loads", async ({ page }) => {
    const response = await page.goto("/communities");
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("domcontentloaded");
  });
});
