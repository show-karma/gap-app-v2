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

    // The homepage hero heading should be visible
    await expect(page.getByRole("heading", { name: /where builders/i })).toBeVisible();

    // The FAQ section should be present on the homepage
    await expect(page.getByText(/frequently asked/i)).toBeVisible();

    assertNoJsErrors(jsErrors);
  });

  test("T35-02: navigation links are present and functional", async ({ page, withApiMocks }) => {
    await withApiMocks();
    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The page should contain a navigation region or header links
    const navLinks = page.getByRole("link");
    await expect(navLinks.first()).toBeVisible();

    // There should be a link to communities or projects
    const communitiesLink = page.getByRole("link", { name: /communit|project|explorer/i });
    await expect(communitiesLink.first()).toBeVisible();
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

    // The community name should appear on the page
    await expect(page.getByText("Optimism")).toBeVisible();

    // The mocked program title should be rendered
    await expect(page.getByText("Retro Funding Round 4")).toBeVisible();
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

    // The program title should be visible on the page
    await expect(page.getByText("Smoke Test Program")).toBeVisible();
  });

  test("T35-05: auth-gated page redirects guests appropriately", async ({ page, withApiMocks }) => {
    const community = createMockCommunity({ slug: "optimism" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
    });

    // Visit the dashboard which requires authentication
    await page.goto("/dashboard", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Should show a sign-in/connect prompt or redirect to login
    const hasAuthPrompt = await Promise.race([
      page
        .getByText(/sign in|connect wallet|log in/i)
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("button", { name: /sign in|connect|log in/i })
        .first()
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false),
    ]);

    // If no auth prompt, the URL might have changed (redirect)
    const wasRedirected = !page.url().includes("/dashboard");

    expect(hasAuthPrompt || wasRedirected).toBeTruthy();
  });

  test("T35-06: API health endpoint responds", async ({ page, withApiMocks }) => {
    await withApiMocks();

    // The health endpoint is mocked by default in setupApiMocks
    const response = await page.request.get("http://localhost:3000/api/health", {
      failOnStatusCode: false,
    });

    // Health endpoint should respond without a server error
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

    // Should have visible buttons (e.g., apply, view details, etc.)
    const buttons = page.getByRole("button");
    await expect(buttons.first()).toBeVisible();

    // Should have visible links for navigation
    const links = page.getByRole("link");
    await expect(links.first()).toBeVisible();

    // The community name should be visible, confirming content rendered past skeletons
    await expect(page.getByText("Optimism")).toBeVisible();

    // The mocked program should appear
    await expect(page.getByText("Open Grants")).toBeVisible();
  });
});
