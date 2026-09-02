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
 * actually observe — an identified distinct id reaches the wire while signed
 * in, and none does after signing out.
 *
 * The assertions are on the DECODED WIRE PAYLOAD, with the persisted store as a
 * secondary check. The store says what Mixpanel is holding; only the wire says
 * what left the browser, and the wire is what a real project would have
 * received. A build that cleared the store after already flushing the previous
 * user's id would satisfy a store-only assertion and still have leaked.
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

/** One decoded record as it left the browser, in wire order. */
interface WireEvent {
  name: string;
  props: Record<string, unknown>;
}

/**
 * Every event posted through the same-origin proxy, decoded, oldest first.
 *
 * The SDK posts `data=<base64 JSON>` to `/api/mp/track`; the route is fulfilled
 * with a success body rather than forwarded, so a test run never writes into a
 * real Mixpanel project.
 *
 * This is the PRIMARY signal for the identity contract. The persisted store
 * says what Mixpanel is holding; only the wire says what actually left the
 * browser, and it is the wire that a real project would have received. A build
 * that cleared the store but had already flushed the previous user's id would
 * pass a store-only assertion.
 */
function captureWireEvents(page: Page): WireEvent[] {
  const events: WireEvent[] = [];
  void page.route("**/api/mp/track**", async (route) => {
    const body = route.request().postData() ?? "";
    const encoded = new URLSearchParams(body).get("data") ?? "";
    try {
      const decoded = JSON.parse(
        /^[A-Za-z0-9+/=]+$/.test(encoded) ? atob(encoded) : encoded
      ) as unknown;
      // Batched requests arrive as an array; a single event as one object.
      for (const record of Array.isArray(decoded) ? decoded : [decoded]) {
        const { event, properties } = record as { event?: unknown; properties?: unknown };
        if (typeof event !== "string") continue;
        events.push({
          name: event,
          props:
            typeof properties === "object" && properties !== null
              ? (properties as Record<string, unknown>)
              : {},
        });
      }
    } catch {
      // An undecodable payload fails the assertions below rather than passing
      // silently — it must never be treated as "no identity on the wire".
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "1" });
  });
  return events;
}

/** Distinct ids that actually reached the wire, in order, ignoring absent ones. */
const wireUserIds = (events: readonly WireEvent[]): unknown[] =>
  events.map((e) => e.props[USER_ID_PROPERTY]).filter((id) => id !== undefined);

/**
 * The SDK batches, and `batch_flush_interval_ms` defaults to 10s — so anything
 * waiting on the wire needs materially longer than Playwright's 5s default.
 */
const WIRE_TIMEOUT_MS = 30_000;

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
    const wire = captureWireEvents(page);
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(createMockCommunity({ slug: "optimism" })),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // PRIMARY — what actually left the browser.
    await expect
      .poll(() => wireUserIds(wire), {
        message: "an event should reach the wire carrying the identified distinct id",
        timeout: WIRE_TIMEOUT_MS,
      })
      .toContain(EXPECTED_MOCK_USER_ID);

    // And nothing on the wire claims to be anybody else.
    expect(new Set(wireUserIds(wire))).toEqual(new Set([EXPECTED_MOCK_USER_ID]));

    // SECONDARY — what Mixpanel is holding.
    await expect
      .poll(async () => (await readMixpanelStore(page))?.[USER_ID_PROPERTY], {
        message: "Mixpanel should hold an identified distinct id while signed in",
      })
      .toBe(EXPECTED_MOCK_USER_ID);
  });

  test("holds no identity for a signed-out visitor", async ({ page, withApiMocks }) => {
    const wire = captureWireEvents(page);
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(createMockCommunity({ slug: "optimism" })),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    await expect
      .poll(() => wire.length, {
        message: "the page should emit at least one event, or this asserts nothing",
        timeout: WIRE_TIMEOUT_MS,
      })
      .toBeGreaterThan(0);
    expect(wireUserIds(wire)).toEqual([]);

    const store = await readMixpanelStore(page);
    expect(store?.[USER_ID_PROPERTY]).toBeUndefined();
  });

  test("drops the identity after signing out", async ({ page, withApiMocks, loginAs }) => {
    const signedInWire = captureWireEvents(page);
    await loginAs("applicant");
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(createMockCommunity({ slug: "optimism" })),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);
    await expect
      .poll(() => wireUserIds(signedInWire), {
        message: "the signed-in phase should put the identity on the wire first",
        timeout: WIRE_TIMEOUT_MS,
      })
      .toContain(EXPECTED_MOCK_USER_ID);

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
    const signedOutWire = captureWireEvents(signedOut);
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

    // PRIMARY — the FIRST event off the signed-out page. Later events proving
    // clean says little; the first one is what a leak would ride out on, before
    // the reset had landed.
    await expect
      .poll(() => signedOutWire.length, {
        message: "the signed-out page should emit at least one event, or this asserts nothing",
        timeout: WIRE_TIMEOUT_MS,
      })
      .toBeGreaterThan(0);
    expect(signedOutWire[0].props).not.toHaveProperty(USER_ID_PROPERTY);
    expect(wireUserIds(signedOutWire)).toEqual([]);

    // SECONDARY — and Mixpanel is no longer holding it either.
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

    const wire = captureWireEvents(page);
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
      .poll(() => wire.map((e) => e.name), {
        message: "AnalyticsProvider is the single emitter of `logout`",
        timeout: WIRE_TIMEOUT_MS,
      })
      .toContain("logout");
  });
});
