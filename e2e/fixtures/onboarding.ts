import type { Page } from "@playwright/test";

/**
 * Onboarding walkthroughs offer themselves automatically, and a driver.js
 * spotlight covers the page with an overlay that swallows clicks. Left alone, a
 * tour firing mid-test makes an unrelated spec fail on an element that is
 * visibly there but not reachable — a failure that reads as a bug in whatever
 * the spec was actually testing.
 *
 * So specs start with the walkthroughs marked as already seen, and a spec that
 * wants to exercise one opts back in with `allowOnboardingTours`.
 *
 * Kept in the e2e fixtures rather than behind a flag in the app: production has
 * no business knowing it is under test.
 */

const NAMESPACE = "karma:onboarding";

/** Mirrors the tour ids and versions in `src/features/onboarding/lib/tours.ts`. */
const TOUR_SURFACES = [
  "tour:getting-started:v1",
  "tour:find-funders:v1",
  "tour:reviewer-inbox:v1",
  "tour:project-workspace:v1",
];

/**
 * Under the e2e auth bypass the Privy bridge never resolves a user, so the app
 * files onboarding state under the anonymous scope. If a spec ever drives a
 * real Privy session, its state would be filed under that DID instead and would
 * need suppressing separately.
 */
const E2E_SCOPE = "anon";

export async function suppressOnboardingTours(page: Page): Promise<void> {
  await page.addInitScript(
    ({ namespace, scope, surfaces }) => {
      const record = JSON.stringify({ outcome: "completed", dismissals: 0 });
      for (const surface of surfaces) {
        localStorage.setItem(`${namespace}:${scope}:${surface}`, record);
      }
    },
    { namespace: NAMESPACE, scope: E2E_SCOPE, surfaces: TOUR_SURFACES }
  );
}

/**
 * Clears onboarding state so walkthroughs offer themselves again. Call after
 * navigation, then reload — `suppressOnboardingTours` runs on every document,
 * so a spec testing a tour should skip it rather than fight it.
 */
export async function allowOnboardingTours(page: Page): Promise<void> {
  await page.evaluate((namespace) => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${namespace}:`)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  }, NAMESPACE);
}
