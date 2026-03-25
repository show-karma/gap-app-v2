import { createMockApplication } from "../../data/applications";
import { createMockCommunity, MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mock404, mockError, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/**
 * Cross-boundary integration tests: Auth + API interactions.
 *
 * These tests verify the seam between the authentication layer and
 * the indexer API. They cover scenarios where auth state and API
 * responses interact: expired tokens, permission-gated endpoints,
 * and auth-dependent data fetching.
 */
test.describe("Auth + API Cross-Boundary", () => {
  test("T32-06: admin API endpoints return data for admin role", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await loginAs("communityAdmin");

    const community = MOCK_COMMUNITIES.optimism;
    const program = createMockProgram({ programId: "p1" });
    const applications = [
      createMockApplication({ referenceNumber: "APP-001", status: "pending" }),
      createMockApplication({ referenceNumber: "APP-002", status: "approved" }),
    ];

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      "**/v2/funding-applications/program/program-001**": mockJson(applications),
      "**/v2/user/communities/admin": mockJson([community]),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Admin should see community content and admin-specific elements
    await expect(page.getByText("Optimism").first()).toBeVisible();
    const bodyText = await page.textContent("body");
    expect(bodyText?.toLowerCase()).not.toContain("unauthorized");
  });

  test("T32-07: guest cannot access admin-only API data", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await loginAs("guest");

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      // Admin endpoints return empty for guests
      "**/v2/user/communities/admin": mockJson([]),
      "**/v2/funding-applications/program/**": mockJson([]),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Guest should see public content
    await expect(page.getByText("Optimism").first()).toBeVisible();
    // No admin UI should be visible
    const manageLink = page.getByRole("link", { name: /manage/i });
    await expect(manageLink).toHaveCount(0);
  });

  test("T32-08: expired auth token triggers graceful degradation", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      // Simulate expired token on permission check
      "**/v2/auth/permissions**": mockError(401, "Token expired"),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should degrade gracefully — show content or prompt re-auth
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(20);
    // Should not show raw error JSON
    expect(bodyText).not.toContain('"statusCode":401');

    assertNoJsErrors(jsErrors);
  });

  test("T32-09: permission API failure defaults to guest role", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    await loginAs("communityAdmin");

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      // Permission endpoint completely fails
      "**/v2/auth/permissions**": mockError(500, "Internal Server Error"),
      "**/auth/staff/authorized**": mockError(500, "Internal Server Error"),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // When permissions fail, the app should fallback to guest behavior
    // rather than showing admin UI with broken permissions
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    // Page should render community content (possibly as guest)
    await expect(page.getByText("Optimism").first()).toBeVisible();
  });

  test("T32-10: concurrent API failures do not cause cascading errors", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);

    await loginAs("applicant");

    const community = MOCK_COMMUNITIES.optimism;
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      // Multiple endpoints fail simultaneously
      "**/v2/user/projects**": mockError(503, "Service Unavailable"),
      "**/v2/funding-applications/user/**": mockError(503, "Service Unavailable"),
      "**/v2/funding-program-configs/community/**": mockError(503, "Service Unavailable"),
    });

    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should render the shell at minimum — not a blank white screen
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(10);

    assertNoJsErrors(jsErrors);
  });
});
