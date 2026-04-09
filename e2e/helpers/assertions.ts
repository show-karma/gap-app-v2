import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Assert a CSS custom property has the expected value.
 */
export async function assertThemeColor(
  page: Page,
  cssVar: string,
  expectedValue: string
): Promise<void> {
  const value = await page.evaluate((varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }, cssVar);
  expect(value).toBe(expectedValue);
}

/**
 * Collect JS errors during a test. Call at test start, check at end.
 * Ignores common hydration warnings that are non-fatal.
 */
export function collectJsErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    const msg = error.message;
    // Ignore React hydration errors (common in Next.js with E2E auth bypass)
    // #418 = server/client HTML mismatch, #423 = text content mismatch
    if (msg.includes("Hydration") || msg.includes("hydrat")) return;
    if (msg.includes("Minified React error #418") || msg.includes("Minified React error #423"))
      return;
    // Ignore ResizeObserver errors (browser-specific, non-fatal)
    if (msg.includes("ResizeObserver")) return;
    // Ignore upstream image fetch failures (external CDN 404s, e.g. Twitter profile pics)
    if (msg.includes("upstream image response failed")) return;
    // Ignore SSL certificate errors in CI (unable to get local issuer certificate)
    if (msg.includes("local issuer certificate")) return;
    errors.push(msg);
  });
  return errors;
}

/**
 * Assert no unexpected JS errors occurred during the test.
 */
export function assertNoJsErrors(errors: string[]): void {
  expect(errors).toEqual([]);
}

/**
 * Assert that a page has the correct meta tag values.
 */
export async function assertMetaTag(
  page: Page,
  name: string,
  expectedContent: string
): Promise<void> {
  const content = await page
    .locator(`meta[name="${name}"], meta[property="${name}"]`)
    .getAttribute("content");
  expect(content).toContain(expectedContent);
}
