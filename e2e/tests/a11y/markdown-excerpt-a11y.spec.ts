import type { Page } from "@playwright/test";
import { expect, mockJson, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Browser-level accessibility validation for the card markdown excerpt renderer
 * (PR #1621 / issue #1481) — exercised against *adversarial* card content, not
 * just well-formed prose.
 *
 * The unit suite (`projects-explorer-a11y.test.tsx`) renders a single ProjectCard
 * in jsdom; this spec renders the *real* `/projects` explorer in a real Chromium,
 * drives the React Query data path with hostile markdown fixtures, and asserts
 * the invariant the excerpt variant exists to guarantee: nothing interactive
 * (and no Streamdown copy/download/image chrome) ever nests inside the card's
 * own <Link>, which would trip WCAG 4.1.2 (nested-interactive / blank-name
 * buttons) on a 50-card grid.
 */

// Each entry is a project description crafted to make the *full* interactive
// markdown renderer emit links / images / code-copy buttons / checkboxes.
const HOSTILE_MARKDOWN: Record<string, string> = {
  inlineLink: "Visit [our portal](https://evil.example.com/phishing) to continue reading more.",
  image: "Banner: ![promo banner](https://evil.example.com/track.png) and trailing copy.",
  codeFence: "Here is a snippet:\n\n```js\nfetch('https://evil.example.com')\n```\n\nmore text.",
  taskList: "Checklist:\n\n- [ ] pending item\n- [x] completed item\n- [ ] another",
  rawHtml:
    'Raw: <a href="https://evil.example.com">nested anchor</a> <button>press me</button> <img src="https://evil.example.com/x.png" alt="x">',
  heading: "# Injected H1 Heading\n\n## And an H2\n\nFollowed by body prose for the excerpt.",
  danglingTokens:
    "An unterminated [link](https://evil.example.com and an open ```ts\nconst secret =",
  longUnbroken: `Prefix ${"A".repeat(2000)} suffix`,
  table:
    "| Col A | Col B |\n| --- | --- |\n| [cell link](https://evil.example.com) | ![img](https://evil.example.com/c.png) |",
};

function buildProject(id: number, description: string) {
  return {
    uid: `0x${id.toString(16).padStart(64, "0")}`,
    chainID: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    details: {
      // NB: must NOT contain "test" — the service filters those out.
      slug: `hostile-markdown-project-${id}`,
      title: `Hostile Markdown Project ${id}`,
      description,
      missionSummary: "Fallback mission summary.",
      logoUrl: "",
    },
    stats: { grantsCount: 2, grantMilestonesCount: 3, roadmapItemsCount: 1 },
  };
}

function paginatedPayload() {
  const payload = Object.values(HOSTILE_MARKDOWN).map((desc, i) => buildProject(i + 1, desc));
  return {
    payload,
    pagination: { page: 1, limit: payload.length, totalCount: payload.length, hasNextPage: false },
  };
}

// Interactive descendants that must never appear inside the card's own <Link>
// (the avatar <img> is intentionally excluded — images are not interactive).
const NESTED_INTERACTIVE = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[contenteditable="true"]',
  "[tabindex]",
].join(", ");

const CARD_SELECTOR = 'a[aria-label^="View "]';

// Navigate to the explorer and wait for the client-side React Query fetch to
// resolve and render the (mocked) hostile-markdown cards. `waitForPageReady`
// only resolves the DOM load, so cards arrive a beat later.
async function gotoExplorerWithCards(page: Page) {
  await page.goto("/projects", GOTO_OPTIONS);
  await waitForPageReady(page);
  await page.locator(CARD_SELECTOR).first().waitFor({ state: "visible", timeout: 30_000 });
}

test.describe("Card markdown excerpt — adversarial a11y (#1481)", () => {
  test.beforeEach(async ({ withApiMocks }) => {
    await withApiMocks({
      // Explorer list endpoint (client-fetched via React Query, with a query
      // string of page/limit/sort params — match path + any query).
      "**/v2/projects**": mockJson(paginatedPayload()),
    });
  });

  test("hostile markdown never nests interactive elements inside a card link", async ({ page }) => {
    await gotoExplorerWithCards(page);

    const cards = page.locator(CARD_SELECTOR);
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(Object.keys(HOSTILE_MARKDOWN).length);

    // The core WCAG 4.1.2 invariant: zero interactive descendants in every card.
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const nested = await card.locator(NESTED_INTERACTIVE).count();
      const label = await card.getAttribute("aria-label");
      expect(nested, `interactive descendants inside card "${label}"`).toBe(0);
    }
  });

  test("hostile links/images render inert (no real anchors or img requests)", async ({ page }) => {
    const requestedHostile: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("evil.example.com")) requestedHostile.push(r.url());
    });

    await gotoExplorerWithCards(page);

    // The markdown link/image targets must not become live anchors or <img>s …
    await expect(page.locator('a[href*="evil.example.com"]')).toHaveCount(0);
    await expect(page.locator('img[src*="evil.example.com"]')).toHaveCount(0);
    // … and therefore the browser must never fetch the hostile image/track URL.
    expect(requestedHostile, "no requests to hostile markdown URLs").toEqual([]);

    // The link *text* is preserved as inert prose (accessibility is not lost).
    await expect(page.getByText("our portal").first()).toBeVisible();
  });

  test("excerpt emits no Streamdown copy/download chrome or blank-name buttons", async ({
    page,
  }) => {
    await gotoExplorerWithCards(page);

    const explorer = page.getByRole("main");
    await expect(explorer).toHaveCount(1); // single landmark (#1309)

    // controls={false} → no copy/download/fullscreen buttons anywhere in cards.
    const buttons = page.locator('a[aria-label^="View "] button');
    await expect(buttons).toHaveCount(0);

    // Headings in descriptions are demoted to <p>, so no markdown-injected
    // headings leak into the card (which would pollute the heading outline).
    const cardHeadings = page.locator('a[aria-label^="View "] h1, a[aria-label^="View "] h2');
    await expect(cardHeadings).toHaveCount(0);
  });
});
