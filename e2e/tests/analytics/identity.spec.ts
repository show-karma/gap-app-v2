import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { createMockCommunity } from "../../data/communities";
import { expect, mockJson, test } from "../../fixtures";
import { logout } from "../../fixtures/auth";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Browser-level coverage for the analytics identity contract.
 *
 * Until the E2E bypass carried a DID, this was untestable: Privy produces no
 * `user` under the bypass, so `AnalyticsProvider` had no id to identify and
 * gated OFF every authenticated emission. `E2E_MOCK_USER_ID` closes that, and
 * these tests pin the two halves of the contract that a mock session can
 * actually observe — Mixpanel holds an identified distinct id while signed in,
 * and holds none after signing out.
 *
 * One harness constraint shapes the sign-out case: `loginAs` installs the
 * bypass through `page.addInitScript`, which re-runs on every navigation of
 * that page. Reloading therefore signs the visitor back in, and the sign-out
 * assertion goes red against a correct product. Init scripts are per-page and
 * `localStorage` is per-origin, so the signed-out phase runs on a second page
 * in the same context instead.
 *
 * What a mock session CANNOT observe is the `logout` EVENT. It needs a
 * continuous `authenticated: true -> false` transition inside one document, and
 * the bypass reads its state from localStorage through a memo that only
 * re-evaluates when Privy's own `ready`/`authenticated` change — which they
 * never do when Privy was never really signed in. That case is therefore gated
 * on a real-credential run and skipped otherwise, rather than asserted against
 * a transition the harness cannot produce.
 */

/**
 * Mirrors `E2E_MOCK_USER_ID` in `utilities/auth/e2e-auth.ts`, which the e2e
 * tsconfig cannot import (`@/` is not on its paths). Duplicated deliberately:
 * this is the contract the browser is being held to, and a literal here fails
 * loudly if the app's constant ever changes.
 */
const EXPECTED_MOCK_USER_ID = "did:privy:e2e-mock-user";

/** Mixpanel's persistence key is `mp_<token>_mixpanel`; the token is server-side. */
const MIXPANEL_STORE_KEY = /^mp_.+_mixpanel$/;

/** Mixpanel's own key for the identified distinct id, in its persisted store. */
const USER_ID_PROPERTY = "$user_id";

/** Whatever Mixpanel has persisted for this origin, or null when it has nothing. */
async function readMixpanelStore(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((pattern) => {
    const key = Object.keys(localStorage).find((k) => new RegExp(pattern).test(k));
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null") as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }, MIXPANEL_STORE_KEY.source);
}

/**
 * Event names posted through the same-origin proxy, newest last.
 *
 * The SDK posts `data=<base64 JSON>` to `/api/mp/track`; the route is fulfilled
 * with a success body rather than forwarded, so a test run never writes into a
 * real Mixpanel project.
 */
function captureTrackedEvents(page: Page): string[] {
  const names: string[] = [];
  void page.route("**/api/mp/track**", async (route) => {
    const body = route.request().postData() ?? "";
    const encoded = new URLSearchParams(body).get("data") ?? "";
    try {
      const decoded = JSON.parse(
        /^[A-Za-z0-9+/=]+$/.test(encoded) ? atob(encoded) : encoded
      ) as unknown;
      for (const record of Array.isArray(decoded) ? decoded : [decoded]) {
        const name = (record as { event?: unknown }).event;
        if (typeof name === "string") names.push(name);
      }
    } catch {
      // A payload this test cannot read is not a failure of the contract it
      // covers; the store assertions below are the primary signal.
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "1" });
  });
  return names;
}

/**
 * Whether the app under test has analytics on.
 *
 * Next loads `.env` for the dev server; the Playwright runner does not load it
 * at all. Reading only `process.env` therefore skipped this whole file in
 * exactly the setup where it can run — a suite that is always green because it
 * never executes. Fall back to the file the server will read.
 */
const analyticsEnabled = (): boolean => {
  if (process.env.NEXT_PUBLIC_MIXPANEL_KEY) return true;
  try {
    const env = readFileSync(join(__dirname, "..", "..", "..", ".env"), "utf-8");
    return /^\s*NEXT_PUBLIC_MIXPANEL_KEY\s*=\s*\S+/m.test(env);
  } catch {
    return false;
  }
};

const ANALYTICS_ENABLED = analyticsEnabled();

test.describe("Analytics identity", () => {
  test.skip(
    !ANALYTICS_ENABLED,
    "NEXT_PUBLIC_MIXPANEL_KEY is unset, so the client never initialises and there is nothing to observe."
  );

  test("identifies the signed-in user to Mixpanel", async ({ page, withApiMocks, loginAs }) => {
    captureTrackedEvents(page);
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(createMockCommunity({ slug: "optimism" })),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect
      .poll(async () => (await readMixpanelStore(page))?.[USER_ID_PROPERTY], {
        message: "Mixpanel should hold an identified distinct id while signed in",
      })
      .toBe(EXPECTED_MOCK_USER_ID);
  });

  test("holds no identity for a signed-out visitor", async ({ page, withApiMocks }) => {
    captureTrackedEvents(page);
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(createMockCommunity({ slug: "optimism" })),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    const store = await readMixpanelStore(page);
    expect(store?.[USER_ID_PROPERTY]).toBeUndefined();
  });

  test("drops the identity after signing out", async ({ page, withApiMocks, loginAs }) => {
    captureTrackedEvents(page);
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(createMockCommunity({ slug: "optimism" })),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    await expect
      .poll(async () => (await readMixpanelStore(page))?.[USER_ID_PROPERTY])
      .toBe(EXPECTED_MOCK_USER_ID);

    await logout(page);

    // The signed-out phase runs on a NEW PAGE, not a reload.
    //
    // `loginAs` installs the bypass with `page.addInitScript`, and init scripts
    // re-run on every navigation of the page they were added to — so reloading
    // this one writes `privy:auth_state` straight back and signs the visitor in
    // again before the provider ever settles. The assertion below then fails
    // against a product that is behaving correctly.
    //
    // Init scripts are per-page while `localStorage` is per-origin, so a second
    // page in the same context is genuinely signed out and still sees the
    // Mixpanel store the signed-in page wrote. That is exactly the state a real
    // signed-out load starts from, and `resetIdentity()` is what has to clear
    // it — a session that ends must not leave the previous user's distinct id
    // attached to the next visitor's events.
    //
    // The first test in this file is what establishes that the id was there to
    // begin with; this one owns the clearing half.
    const signedOut = await page.context().newPage();
    captureTrackedEvents(signedOut);
    await signedOut.route(
      "**/v2/communities/optimism",
      mockJson(createMockCommunity({ slug: "optimism" }))
    );

    await signedOut.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(signedOut);

    // Guard against a vacuous pass, and it has to sit AFTER the navigation: a
    // freshly opened page is on `about:blank`, which has no accessible
    // `localStorage`, so reading it there throws SecurityError rather than
    // returning the store.
    //
    // What it buys: the assertion below would also be satisfied if analytics
    // had simply never initialised on this page, in which case it proves
    // nothing about `resetIdentity()`. A present store means the client ran.
    await expect
      .poll(async () => await readMixpanelStore(signedOut), {
        message: "Mixpanel should have initialised on the signed-out page",
      })
      .not.toBeNull();

    await expect
      .poll(async () => (await readMixpanelStore(signedOut))?.[USER_ID_PROPERTY], {
        message: "resetIdentity() should have cleared the distinct id",
      })
      .toBeUndefined();

    await signedOut.close();
  });

  test("emits a logout event when the session ends in-document", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    test.skip(
      !process.env.QA_TEST_EMAIL,
      "Needs a real Privy session: the mock bypass cannot produce a continuous authenticated -> unauthenticated transition, so no logout event is emitted. See the file docblock."
    );

    const events = captureTrackedEvents(page);
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(createMockCommunity({ slug: "optimism" })),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    await page.evaluate(() => {
      localStorage.removeItem("privy:token");
      window.dispatchEvent(new StorageEvent("storage", { key: "privy:token", newValue: null }));
    });

    await expect
      .poll(() => events, {
        message: "AnalyticsProvider is the single emitter of `logout`",
      })
      .toContain("logout");
  });
});
