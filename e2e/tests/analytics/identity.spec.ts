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

const ANALYTICS_ENABLED = Boolean(process.env.NEXT_PUBLIC_MIXPANEL_KEY);

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
    // A reload is what makes the bypass re-read its cleared state. The provider
    // then settles an unauthenticated identity and calls `resetIdentity()`,
    // which is what has to clear the distinct id — a session that ends must not
    // leave the previous user's id attached to the next visitor's events.
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect
      .poll(async () => (await readMixpanelStore(page))?.[USER_ID_PROPERTY], {
        message: "resetIdentity() should have cleared the distinct id",
      })
      .toBeUndefined();
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
