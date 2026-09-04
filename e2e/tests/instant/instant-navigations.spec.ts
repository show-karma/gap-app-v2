import { instant } from "@next/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The ten navigations that must feel instant (P2-5).
 *
 * `instant()` from `@next/playwright` holds the navigation lock through a
 * cookie: inside the callback Next renders the *prefetched* UI immediately and
 * refuses to stream dynamic data until the callback returns. So an assertion
 * written inside the scope can only ever see what was already cached — which
 * is exactly the property we want to pin. If a route needs a server round trip
 * before it can paint anything, the assertion inside the scope fails.
 *
 * ## This suite does not run yet, and that is deliberate
 *
 * `instant()` is meaningless until `cacheComponents` + `partialPrefetching` are
 * on, which is P2-6. Until then every test here skips with a reason rather than
 * failing, and CI stays green. Turn it on by pointing the runner at a preview
 * built with the flags enabled:
 *
 *   INSTANT_NAV_E2E=1 BASE_URL=https://<preview> pnpm e2e:pw e2e/tests/instant
 *
 * It also has to be a *production* build. `next dev` does not prefetch the way
 * a build does, and a dev server would make every assertion below pass or fail
 * for the wrong reason.
 *
 * ## Why nothing here hardcodes a slug
 *
 * A community slug, a program id or a blog slug in a spec file is a fixture
 * that rots against whatever data the target deployment happens to hold. Every
 * case instead discovers its link from the page it starts on: navigate to the
 * index, take the first link matching the destination's shape, click that.
 * When the index has no such link — an empty environment — the test skips with
 * a reason instead of failing, because that is a data condition, not a
 * navigation regression.
 *
 * ## Route classes (see .maestri/reports/phase-2-triage-matrix.md §1)
 *
 * Cache-class routes are crawlable, so DEV-612 forbids a Suspense boundary
 * above their content: their `<h1>` is part of the cached shell and must be
 * visible *inside* the instant scope. Stream-class routes are free to stream
 * their heading, so those cases assert only the shell and the URL commit.
 */

/** Opt-in switch. Off in CI until the P2-6 flag flip. */
const INSTANT_NAV_ENABLED = process.env.INSTANT_NAV_E2E === "1";

const SKIP_REASON =
  "instant() needs cacheComponents + partialPrefetching, which are flipped in P2-6. " +
  "Run with INSTANT_NAV_E2E=1 against a production build of a preview that has both on.";

/** The navbar landmark, present on every route inside the `(chrome)` group. */
const APP_CHROME = "nav[data-app-chrome]";

/**
 * Set on the page's global object before a navigation and read after it. A
 * client-side transition preserves it; a full document load wipes it. Without
 * this check a test would happily pass on a hard navigation that merely
 * happened to be fast.
 */
const SENTINEL_KEY = "__instantNavSentinel";

/** How long to let a prefetch land before clicking anyway. */
const PREFETCH_GRACE_MS = 2_000;

/** How long to let a dropdown's modal state lift after the click that closes it. */
const MENU_CLOSE_TIMEOUT_MS = 5_000;

/**
 * The cookie `instant()` uses to hold the navigation lock, and how long to wait
 * for a page load's in-flight write of it to finish.
 *
 * `@next/playwright` documents the hazard in `releaseInstantCookie`: a locked
 * MPA page load re-writes this cookie asynchronously, and the client only stops
 * writing once it observes the deletion — an event that races the pending
 * write. Its own release loop is bounded at five attempts for exactly that
 * reason. The same race runs the other way at acquire time: `instant()` clears
 * the cookie before setting it, so a write still in flight from the `goto()`
 * that opened the source page can land afterwards and leave the scope holding a
 * cookie it did not write.
 */
const INSTANT_LOCK_COOKIE = "next-instant-navigation-testing";
const LOCK_SETTLE_TIMEOUT_MS = 5_000;

/**
 * How long to keep looking for a link before deciding the page does not have
 * one. Several of the index pages render their cards client-side — measured on
 * a preview, `/communities` server-renders only 8 internal links and none of
 * them is a community — so a scan that runs once at `domcontentloaded` finds
 * nothing and the case would skip for the wrong reason.
 */
const LINK_DISCOVERY_TIMEOUT_MS = 15_000;
const LINK_DISCOVERY_POLL_MS = 250;

/**
 * Skip the current test when a link the case depends on is not on the page.
 *
 * `test.skip()` throws, so the `throw` below is unreachable at runtime; it is
 * what lets this be an assertion signature, which narrows the caller's
 * `Locator | null` without a cast.
 */
function skipUnlessFound(link: Locator | null, message: string): asserts link is Locator {
  test.skip(link === null, message);
  if (link === null) throw new Error(message);
}

/**
 * The first link on the page whose href matches `pattern`, or null.
 *
 * Navbar links live inside Radix dropdowns, which do not render their content
 * until opened — so a plain scan misses them. When the first scan comes up
 * empty every dropdown trigger in the chrome is opened in turn and the scan is
 * repeated, leaving the successful one open for the click.
 */
async function findLink(page: Page, pattern: RegExp): Promise<Locator | null> {
  // Returns the matching *href*, not a locator. Three reasons, all measured:
  //
  // One round trip instead of one per anchor. The previous shape called
  // `getAttribute` inside a loop, a separate protocol call each time; `/` holds
  // 60+ internal anchors once a dropdown is open and this scan re-runs every
  // LINK_DISCOVERY_POLL_MS, which exhausted the 30s test budget mid-scan
  // (observed failing at anchor 62) before the dropdown fallback was reached.
  //
  // And an index is not a stable handle. Returning `anchors.nth(i)` produced a
  // locator re-resolved at use time against a DOM that had since re-rendered:
  // test 1 asked for `/projects`, and by the time it hovered, index 23 had
  // become `<a href="/community/celopg">` — an animating pill that never went
  // stable, so the hover hung until the test timed out. Keying on the href
  // survives re-renders and cannot silently select a different destination.
  //
  // And rendered anchors only. Responsive layouts ship the same link twice — the
  // project profile has its tab bar in both a `lg:hidden` mobile copy and a
  // desktop copy — and the mobile one is `display: none` at the test viewport,
  // so it has no client rects. Taking it would hand back a link no user can
  // click: test 8 selected exactly that copy and sat in
  // `scrollIntoViewIfNeeded` ("element is not visible") until the test timed
  // out. `getClientRects()` is empty only for genuinely unrendered elements,
  // so an off-screen link that just needs scrolling still qualifies.
  const scan = async (): Promise<string | null> => {
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.getClientRects().length > 0)
          .map((node) => node.getAttribute("href"))
      );

    return hrefs.find((href): href is string => href !== null && pattern.test(href)) ?? null;
  };

  const locate = (href: string): Locator =>
    page
      .locator(`a[href="${href.replaceAll('"', '\\"')}"]`)
      .filter({ visible: true })
      .first();

  const onPage = await scan();
  if (onPage !== null) return locate(onPage);

  // Dropdowns first, then the slow poll. A dropdown's contents are static once
  // opened, so this path is deterministic and costs a few hundred milliseconds
  // — whereas the poll below exists for client-rendered lists and always burns
  // its full LINK_DISCOVERY_TIMEOUT_MS when the link is not in the initial HTML.
  // Running the poll first charged that timeout to every dropdown-only
  // destination (/projects, /communities, /funding-map are reachable no other
  // way) and left too little of the 30s test budget for the navigation itself.
  const triggers = page.locator(`${APP_CHROME} button[aria-haspopup="menu"]`);
  const triggerCount = await triggers.count();
  for (let index = 0; index < triggerCount; index++) {
    await triggers.nth(index).click();
    const inMenu = await scan();
    if (inMenu !== null) {
      // Scope to the open menu. The same href can appear both in the menu and
      // in the page behind it — /communities lists communities that the
      // dropdown also links to — and the page copy is under Radix's modal
      // overlay, so hovering it fails with `<html> intercepts pointer events`.
      // The menu copy is the one the click has to go through anyway.
      const scoped = page.locator(`[role="menu"] a[href="${inMenu.replaceAll('"', '\\"')}"]`);
      return (await scoped.count()) > 0 ? scoped.first() : locate(inMenu);
    }
    await page.keyboard.press("Escape");
  }

  // No dropdown had it, so leave the document interactive again before falling
  // through. Radix keeps `pointer-events: none` on `<body>` while a menu is
  // open, and a trailing Escape does not always land before the next action:
  // without this the list link found below is visible and stable but unhoverable,
  // reported as `<html> intercepts pointer events` until the test times out.
  await waitForMenuDismissed(page);

  // Nothing in the chrome either: wait for a client-rendered list to arrive.
  const deadline = Date.now() + LINK_DISCOVERY_TIMEOUT_MS;
  do {
    await page.waitForTimeout(LINK_DISCOVERY_POLL_MS);
    const settled = await scan();
    if (settled !== null) return locate(settled);
  } while (Date.now() < deadline);

  return null;
}

/** The href of a discovered link, which the DOM query guarantees is present. */
async function hrefOf(link: Locator): Promise<string> {
  const href = await link.getAttribute("href");
  if (href === null) throw new Error("a link discovered by href selector has no href");
  return href;
}

/**
 * Give Next a chance to prefetch `href` before the click.
 *
 * Scrolling the link into view and hovering it is what triggers the prefetch;
 * the race is there so a route that does not prefetch (or already holds the
 * payload) costs two seconds rather than a timeout. A missed prefetch shows up
 * as a failed assertion inside the instant scope, which is the correct place
 * for it to be reported.
 */
async function primePrefetch(page: Page, link: Locator, href: string): Promise<void> {
  const prefetched = page
    .waitForResponse(
      (response) =>
        response.url().includes(href) &&
        response.request().headers()["next-router-prefetch"] === "1",
      { timeout: PREFETCH_GRACE_MS }
    )
    .catch(() => null);

  // A dropdown left open by link discovery still has Radix's overlay up, and
  // the overlay swallows the hover below (`<html> intercepts pointer events`)
  // for any link that is not itself inside the menu — which is every link found
  // by the client-render poll after the dropdown scan opened one. Links that ARE
  // in the menu sit above the overlay and must keep it: dismissing would unmount
  // the very link about to be clicked.
  const linkIsInMenu = await link.evaluate((node) => node.closest('[role="menu"]') !== null);
  if (!linkIsInMenu) await waitForMenuDismissed(page);

  await link.scrollIntoViewIfNeeded();
  await link.hover();
  await prefetched;
}

/**
 * Wait for an open Radix dropdown's modal state to lift.
 *
 * Three of these navigations start from a link that only exists inside a navbar
 * dropdown, and Radix renders those as *modal* menus: while one is open it sets
 * `aria-hidden="true"` on the page wrapper and `pointer-events: none` on
 * `<body>`. `aria-hidden` removes everything behind the menu from the
 * accessibility tree, and `getByRole()` queries that tree rather than the DOM —
 * so the destination's `<h1>` is present and painted but invisible to the
 * assertion. Measured on the preview with a menu open: `getByRole("heading",
 * { level: 1 })` matches 0 while `document.querySelectorAll("h1")` matches 1;
 * once the menu closes both match 1. The chrome assertion is unaffected,
 * because `nav[data-app-chrome]` is a CSS selector and never consults the
 * accessibility tree.
 *
 * Outside the navigation lock the click would dismiss the menu on its own, as
 * the destination unmounts it. Inside the lock it does not: the lock holds the
 * transition, the source page stays mounted, and Radix keeps the menu — and the
 * hidden accessibility tree — open indefinitely. Measured: `pointer-events`
 * stays `none` for the full timeout after the click. So the menu is dismissed
 * explicitly, the same way a user leaving a dropdown does.
 *
 * This runs after the click, so the navigation has already been initiated and
 * Escape only closes the menu. It does not weaken any assertion: what is
 * asserted is unchanged, everything still runs inside the lock, and a route
 * that genuinely needed a server round trip would still fail.
 */
async function waitForMenuDismissed(page: Page): Promise<void> {
  // Both halves of the modal state, polled together. Radix restores
  // `pointer-events` and clears `aria-hidden` on separate ticks, so keying on
  // either one alone lets the other still be in force: watching only
  // `pointer-events` left `aria-hidden` set and the `getByRole` heading
  // assertion still failed intermittently.
  const modalState = () =>
    page.evaluate(() => {
      const blocked =
        document.body.style.pointerEvents === "none" ||
        getComputedStyle(document.body).pointerEvents === "none";
      const hiddenFromA11y = [...document.querySelectorAll('[aria-hidden="true"]')].some(
        (node) => node.querySelector("h1, [role='heading']") !== null
      );
      return blocked || hiddenFromA11y;
    });

  if (!(await modalState())) return;

  await page.keyboard.press("Escape");
  await expect.poll(modalState, { timeout: MENU_CLOSE_TIMEOUT_MS }).toBe(false);
}

/**
 * Wait until no lock cookie is left over from the page load about to be
 * navigated away from.
 *
 * Applies `@next/playwright`'s own guidance from the other side: rather than
 * letting `instant()` clear the cookie and hope no write is still in flight,
 * settle it *before* entering the scope, so the lock the scope acquires is the
 * only one in play. Polling — not a single read — because the resurrecting
 * write is asynchronous and a cookie observed absent once can come back.
 *
 * This does not remove or weaken the lock. It runs entirely before `instant()`
 * is called, and the navigation under test is still made inside the scope.
 */
async function settleInstantLock(page: Page): Promise<void> {
  const context = page.context();
  const lockCookies = async () =>
    (await context.cookies()).filter((cookie) => cookie.name === INSTANT_LOCK_COOKIE);

  await expect
    .poll(
      async () => {
        const stale = await lockCookies();
        if (stale.length === 0) return 0;
        // Re-add each entry with a past expiry: the same deletion the library
        // uses, which removes only these without disturbing the app's cookies.
        await context.addCookies(
          stale.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: 1,
          }))
        );
        return stale.length;
      },
      { timeout: LOCK_SETTLE_TIMEOUT_MS }
    )
    .toBe(0);
}

interface InstantExpectation {
  /** The URL the click must commit to, checked inside the instant scope. */
  url: RegExp;
  /**
   * Cache-class routes paint their `<h1>` from the cached shell, so it has to
   * be visible before any dynamic data streams. Stream-class routes may not.
   */
  headingIsCached: boolean;
}

/**
 * Click `link` under the navigation lock and assert the destination painted
 * from cache: the URL committed, the chrome survived, and — for a Cache-class
 * route — the heading was already there. Then, outside the scope, assert the
 * sentinel survived, proving this was a client transition and not a reload.
 */
async function expectInstantNavigation(
  page: Page,
  link: Locator,
  expectation: InstantExpectation
): Promise<void> {
  await primePrefetch(page, link, await hrefOf(link));

  await page.evaluate((key) => {
    Object.assign(globalThis, { [key]: true });
  }, SENTINEL_KEY);

  await settleInstantLock(page);

  await instant(page, async () => {
    await link.click();
    await waitForMenuDismissed(page);

    await expect(page).toHaveURL(expectation.url);
    await expect(page.locator(APP_CHROME).first()).toBeVisible();

    if (expectation.headingIsCached) {
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
  });

  const sentinelSurvived = await page.evaluate((key) => key in globalThis, SENTINEL_KEY);
  expect(sentinelSurvived, "a client-side transition must not reload the document").toBe(true);
}

/**
 * Load `from`, find the link to the destination, and assert the navigation is
 * instant. Skips — with a reason — when the source page holds no such link,
 * which happens in an environment with no data rather than on a regression.
 */
async function navigateInstantly(
  page: Page,
  from: string,
  linkPattern: RegExp,
  expectation: InstantExpectation
): Promise<void> {
  await page.goto(from, { waitUntil: "domcontentloaded" });

  const link = await findLink(page, linkPattern);
  skipUnlessFound(link, `no link matching ${linkPattern} on ${from} in this environment`);

  await expectInstantNavigation(page, link, expectation);
}

/** The href of the first community listed on `/communities`. */
async function firstCommunityPath(page: Page): Promise<string> {
  await page.goto("/communities", { waitUntil: "domcontentloaded" });
  const community = await findLink(page, /^\/community\/[^/?#]+$/);
  skipUnlessFound(community, "no community listed on /communities in this environment");
  return hrefOf(community);
}

test.describe("instant navigations", () => {
  test.skip(!INSTANT_NAV_ENABLED, SKIP_REASON);

  test("1. home -> projects explorer", async ({ page }) => {
    await navigateInstantly(page, "/", /^\/projects$/, {
      url: /\/projects$/,
      headingIsCached: true,
    });
  });

  test("2. home -> communities", async ({ page }) => {
    await navigateInstantly(page, "/", /^\/communities$/, {
      url: /\/communities$/,
      headingIsCached: true,
    });
  });

  test("3. home -> funding map", async ({ page }) => {
    await navigateInstantly(page, "/", /^\/funding-map$/, {
      url: /\/funding-map$/,
      headingIsCached: true,
    });
  });

  test("4. communities -> community hub", async ({ page }) => {
    await navigateInstantly(page, "/communities", /^\/community\/[^/?#]+$/, {
      url: /\/community\/[^/?#]+$/,
      headingIsCached: true,
    });
  });

  test("5. community hub -> funding opportunities", async ({ page }) => {
    const community = await firstCommunityPath(page);
    await navigateInstantly(page, community, /^\/community\/[^/?#]+\/funding-opportunities$/, {
      url: /\/funding-opportunities$/,
      headingIsCached: true,
    });
  });

  test("6. funding opportunities -> program detail", async ({ page }) => {
    const community = await firstCommunityPath(page);
    await navigateInstantly(
      page,
      `${community}/funding-opportunities`,
      /^\/community\/[^/?#]+\/programs\/[^/?#]+$/,
      { url: /\/programs\/[^/?#]+$/, headingIsCached: true }
    );
  });

  test("7. projects explorer -> project profile", async ({ page }) => {
    await navigateInstantly(page, "/projects", /^\/project\/[^/?#]+$/, {
      url: /\/project\/[^/?#]+$/,
      headingIsCached: true,
    });
  });

  // Stream class: the funding tab sits behind grant data and is allowed to
  // stream its heading, so only the shell and the URL commit are asserted.
  test("8. project profile -> project funding tab", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    const project = await findLink(page, /^\/project\/[^/?#]+$/);
    skipUnlessFound(project, "no project listed on /projects in this environment");

    await navigateInstantly(page, await hrefOf(project), /^\/project\/[^/?#]+\/funding$/, {
      url: /\/funding$/,
      headingIsCached: false,
    });
  });

  test("9. knowledge index -> knowledge article", async ({ page }) => {
    await navigateInstantly(page, "/knowledge", /^\/knowledge\/[^/?#]+$/, {
      url: /\/knowledge\/[^/?#]+$/,
      headingIsCached: true,
    });
  });

  test("10. blog index -> blog post", async ({ page }) => {
    await navigateInstantly(page, "/blog", /^\/blog\/[^/?#]+$/, {
      url: /\/blog\/[^/?#]+$/,
      headingIsCached: true,
    });
  });
});
