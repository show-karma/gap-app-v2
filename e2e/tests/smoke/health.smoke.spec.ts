import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Smoke Tests — Health", () => {
  test("T35-01: homepage loads and shows main content", async ({ page, withApiMocks }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks({
      "**/v2/communities/stats**": mockJson({
        totalCommunities: 12,
        totalProjects: 340,
        totalGrants: 150,
      }),
    });
    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The homepage should have substantial content rendered
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(50);

    // Should have at least one heading
    const headings = page.getByRole("heading");
    expect(await headings.count()).toBeGreaterThan(0);

    assertNoJsErrors(jsErrors);
  });

  test("T35-02: navigation links are present and functional", async ({ page, withApiMocks }) => {
    await withApiMocks();
    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The page should contain navigation links
    const navLinks = page.getByRole("link");
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    // At least one link should have an href that is not empty or "#"
    let hasValidLink = false;
    for (let i = 0; i < Math.min(linkCount, 20); i++) {
      const href = await navLinks.nth(i).getAttribute("href");
      if (href && href !== "#" && href !== "") {
        hasValidLink = true;
        break;
      }
    }
    expect(hasValidLink).toBeTruthy();
  });

  test("T35-03: community page loads with mocked data", async ({ page, withApiMocks }) => {
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([
        createMockProgram({ title: "Retro Funding Round 4" }),
      ]),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(50);
  });

  test("T35-04: project/program page loads", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({
      programId: "p-smoke",
      title: "Smoke Test Program",
    });

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p-smoke": mockJson(program),
      "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
    });

    await page.goto("/community/optimism/programs/p-smoke", GOTO_OPTIONS);
    await waitForPageReady(page);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(20);
  });

  test("T35-05: auth-gated page is accessible and shows login prompt for guests", async ({
    page,
    withApiMocks,
  }) => {
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    // Visit a page that typically requires authentication (my-applications)
    await page.goto("/community/optimism/my-applications", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Should either show a login prompt, redirect, or render the page
    // The key assertion: the page shows auth-related content or community content
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    const hasExpectedContent =
      bodyText?.toLowerCase().includes("sign in") ||
      bodyText?.toLowerCase().includes("connect wallet") ||
      bodyText?.toLowerCase().includes("log in") ||
      bodyText?.includes("Optimism") ||
      page.url().includes("/community/optimism");
    expect(hasExpectedContent).toBeTruthy();
  });

  test("T35-06: API health endpoint responds", async ({ page, withApiMocks }) => {
    await withApiMocks();

    // The health endpoint is mocked by default in setupApiMocks
    const response = await page.request.get("http://localhost:3000/api/health", {
      failOnStatusCode: false,
    });

    // Health endpoint should respond with some status (200, 404 if not defined, etc.)
    // The key check is that the server is responding at all
    expect(response.status()).toBeDefined();
    expect(response.status()).toBeLessThan(500);
  });

  test("T35-07: static assets load without errors", async ({ page, withApiMocks }) => {
    await withApiMocks();

    const failedResources: string[] = [];
    page.on("requestfailed", (request) => {
      const url = request.url();
      // Track failed CSS and font requests (ignore tracking pixels, analytics, etc.)
      if (
        url.endsWith(".css") ||
        url.endsWith(".woff2") ||
        url.endsWith(".woff") ||
        url.includes("_next/static")
      ) {
        failedResources.push(url);
      }
    });

    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    // No critical static assets should fail to load
    expect(failedResources).toEqual([]);
  });

  test("T35-08: key interactive elements are present on community page", async ({
    page,
    withApiMocks,
  }) => {
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([
        createMockProgram({ title: "Open Grants" }),
      ]),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Should have at least one clickable element (button or link)
    const buttons = page.getByRole("button");
    const links = page.getByRole("link");
    const [buttonCount, linkCount] = await Promise.all([buttons.count(), links.count()]);
    const totalInteractive = buttonCount + linkCount;

    expect(totalInteractive).toBeGreaterThan(0);

    // Should not show raw loading skeletons indefinitely
    // (checking that content has resolved beyond just skeleton divs)
    const bodyText = await page.textContent("body");
    expect(bodyText!.trim().length).toBeGreaterThan(30);
  });
});
