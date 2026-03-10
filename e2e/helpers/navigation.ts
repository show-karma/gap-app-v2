import type { Page } from "@playwright/test";

/**
 * Wait until the page is fully ready (body visible, no loading spinners).
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  // Wait for body to be visible
  await page.locator("body").waitFor({ state: "visible" });
}

/**
 * Navigate to a community page and wait for it to be ready.
 */
export async function navigateToCommunity(page: Page, slug: string): Promise<void> {
  await page.goto(`/community/${slug}`);
  await waitForPageReady(page);
}

/**
 * Navigate to a program within a community and wait for ready.
 */
export async function navigateToProgram(
  page: Page,
  slug: string,
  programId: string
): Promise<void> {
  await page.goto(`/community/${slug}/programs/${programId}`);
  await waitForPageReady(page);
}

/**
 * Navigate to an application and wait for ready.
 */
export async function navigateToApplication(
  page: Page,
  slug: string,
  programId: string,
  referenceNumber: string
): Promise<void> {
  await page.goto(`/community/${slug}/programs/${programId}/applications/${referenceNumber}`);
  await waitForPageReady(page);
}

/**
 * Navigate to the apply page for a program.
 */
export async function navigateToApply(page: Page, slug: string, programId: string): Promise<void> {
  await page.goto(`/community/${slug}/programs/${programId}/apply`);
  await waitForPageReady(page);
}
