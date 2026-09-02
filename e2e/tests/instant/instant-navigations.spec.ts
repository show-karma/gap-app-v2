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
  const scan = async (): Promise<Locator | null> => {
    const anchors = page.locator('a[href^="/"]');
    const count = await anchors.count();
    for (let index = 0; index < count; index++) {
      const anchor = anchors.nth(index);
      const href = await anchor.getAttribute("href");
      if (href !== null && pattern.test(href)) return anchor;
    }
    return null;
  };

  const onPage = await scan();
  if (onPage !== null) return onPage;

  const triggers = page.locator(`${APP_CHROME} button[aria-haspopup="menu"]`);
  const triggerCount = await triggers.count();
  for (let index = 0; index < triggerCount; index++) {
    await triggers.nth(index).click();
    const inMenu = await scan();
    if (inMenu !== null) return inMenu;
    await page.keyboard.press("Escape");
  }

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

  await link.scrollIntoViewIfNeeded();
  await link.hover();
  await prefetched;
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

  await instant(page, async () => {
    await link.click();

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
