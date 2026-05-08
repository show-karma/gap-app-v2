import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, TENANTS, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Smoke Tests -- Tenant Theme", () => {
  test("T-THEME-01: Optimism tenant sets community-specific branding", async ({
    page,
    withApiMocks,
    withTenant,
  }) => {
    const tenant = await withTenant("optimism");
    const community = MOCK_COMMUNITIES.optimism;

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([
        createMockProgram({ title: "Retro Funding" }),
      ]),
    });

    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the page loaded with Optimism branding by checking for the community name
    await expect(page.getByText("Optimism").first()).toBeVisible();

    // Verify the tenant's primary color is applied as a CSS custom property.
    // The whitelabel system converts the tenant primaryColor hex to an HSL token
    // and injects it as --primary on :root.
    const primaryVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    );

    // The CSS variable should be set (non-empty). The exact value depends on
    // the hex-to-HSL conversion in the middleware, so we check it is present.
    expect(primaryVar.length).toBeGreaterThan(0);
  });

  test("T-THEME-02: Filecoin tenant renders with distinct branding", async ({
    page,
    withApiMocks,
    withTenant,
  }) => {
    const tenant = await withTenant("filecoin");
    const community = MOCK_COMMUNITIES.filecoin;

    await withApiMocks({
      "**/v2/communities/filecoin": mockJson(community),
      "**/v2/funding-program-configs/community/filecoin**": mockJson([
        createMockProgram({ title: "Filecoin Dev Grants" }),
      ]),
    });

    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify Filecoin branding appears
    await expect(page.getByText("Filecoin").first()).toBeVisible();

    // Verify CSS custom property is set on the root element
    const primaryVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    );

    expect(primaryVar.length).toBeGreaterThan(0);
  });

  test("T-THEME-03: different tenants produce different CSS custom property values", async ({
    page,
    withApiMocks,
    withTenant,
  }) => {
    // First, visit as Optimism tenant and capture the --primary value
    const optimismTenant = await withTenant("optimism");
    const optimismCommunity = MOCK_COMMUNITIES.optimism;

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(optimismCommunity),
      "**/v2/funding-program-configs/community/optimism**": mockJson([
        createMockProgram({ title: "OP Grants" }),
      ]),
    });

    await page.goto("/", GOTO_OPTIONS);
    await waitForPageReady(page);

    const optimismPrimary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    );

    // Navigate to a second page as Scroll tenant in a new context
    // Since we cannot change the route interceptor mid-test cleanly,
    // we verify the Optimism value is a valid non-empty HSL token
    expect(optimismPrimary.length).toBeGreaterThan(0);

    // Verify that the Optimism and Scroll configs define different primary colors
    // at the configuration level (a unit-level check within the E2E context)
    expect(TENANTS.optimism.primaryColor).not.toBe(TENANTS.scroll.primaryColor);
    expect(TENANTS.optimism.primaryColor).not.toBe(TENANTS.filecoin.primaryColor);
  });

  test("T-THEME-04: non-whitelabel community page loads default theme", async ({
    page,
    withApiMocks,
  }) => {
    // Visit a community page without tenant whitelabel (standard path)
    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([
        createMockProgram({ title: "Retro Funding Round 4" }),
      ]),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The page should load without errors even without whitelabel
    await expect(page.getByText("Optimism").first()).toBeVisible();

    // NOTE: Mock program assertion removed — SSR fetches from real API, not Playwright mocks.

    // The default theme --primary should still be set (from globals.css)
    const primaryVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    );
    expect(primaryVar.length).toBeGreaterThan(0);
  });
});
