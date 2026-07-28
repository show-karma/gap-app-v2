import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

/** Copy rendered when a page denies access ("you are not an admin"). */
const DENIAL_COPY =
  /access denied|not authorized|forbidden|isnt.*admin|need to be an admin|almost there|needs a role|reach out to|staff access required/i;

/**
 * Copy rendered when the permission LOOKUP failed — we could not decide what
 * the viewer may do. Never a valid outcome on any page, for any role.
 */
const PERMISSION_ERROR_COPY = /couldn't verify your access|couldn.t verify your access/i;

async function isVisible(
  page: import("@playwright/test").Page,
  matcher: RegExp,
  timeout = 10000
) {
  return page
    .getByText(matcher)
    .first()
    .waitFor({ timeout })
    .then(() => true)
    .catch(() => false);
}

// Some admin pages check contract ownership (isOwner) via RPC that can't be
// mocked through Playwright route interception, so a "not an admin" denial is a
// legitimate outcome for them and `allowDenial` stays true. Pages gated purely
// on RBAC get `allowDenial: false` — `loginAs()` mocks their permissions
// deterministically, so a denial there is a real failure, not environment drift.
//
// Denial is now matched EXPLICITLY rather than being allowed to satisfy a broad
// content regex. The previous check passed on `/admin|communities|projects|...`,
// which the denial copy itself matches ("Reach out to a community admin"), so a
// fully locked-out admin page counted as a loaded one. That is precisely the
// bug class that shipped "Staff access required" to a real staff member.
async function adminContentCheck(
  page: import("@playwright/test").Page,
  expectedPath: string,
  { allowDenial = true }: { allowDenial?: boolean } = {}
) {
  // Server-side redirects are valid — SSR sees real user permissions, not mocked ones
  const wasRedirected = !page.url().includes(expectedPath);
  if (wasRedirected) return true;

  expect(
    await isVisible(page, PERMISSION_ERROR_COPY, 2000),
    `${expectedPath} could not resolve permissions — the RBAC lookup failed, which is never a valid outcome`
  ).toBe(false);

  if (await isVisible(page, DENIAL_COPY, 2000)) {
    expect(allowDenial, `${expectedPath} denied access to a user who should have it`).toBe(
      true
    );
    return true;
  }

  const [hasHeading, hasText] = await Promise.all([
    page
      .getByRole("heading")
      .first()
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false),
    isVisible(page, /admin|communities|projects|super admin/i),
  ]);

  return hasHeading || hasText;
}

test.describe("Smoke Tests — Admin Pages", () => {
  test.describe("Admin Pages", () => {
    test("T-ADM-01: admin landing page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks({
        "**/v2/communities**": mockJson({
          payload: [],
          pagination: { page: 1, limit: 10, total: 0 },
        }),
      });
      await loginAs("superAdmin");
      await page.goto("/admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-02: admin communities page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/communities", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/communities")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-03: admin communities stats page loads", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/communities/stats", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/communities/stats")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-04: admin projects page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/projects", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/projects")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });
  });

  test.describe("Super Admin Pages", () => {
    test("T-ADM-05: admin faucet page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/faucet", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/admin/faucet")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    test("T-ADM-06: super-admin page loads", async ({ page, withApiMocks, loginAs }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/super-admin", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(await adminContentCheck(page, "/super-admin")).toBeTruthy();
      assertNoJsErrors(jsErrors);
    });

    // Added after /admin/nonprofit-research shipped (2026-07-01) with no smoke
    // coverage and then spent a day serving "Staff access required" to a real
    // SUPER_ADMIN. Unlike the pages above, this gate is pure RBAC — no on-chain
    // ownership check — so `loginAs("superAdmin")` resolves deterministically
    // and a denial here is a bug, never environment drift. Hence allowDenial:
    // false, plus an assertion on page-specific content: a generic "did some
    // heading render" check cannot tell the admin view from the denial card.
    test("T-ADM-07: nonprofit-research admin page loads for staff", async ({
      page,
      withApiMocks,
      loginAs,
    }) => {
      const jsErrors = collectJsErrors(page);

      await withApiMocks();
      await loginAs("superAdmin");
      await page.goto("/admin/nonprofit-research", GOTO_OPTIONS);
      await waitForPageReady(page);

      expect(
        await adminContentCheck(page, "/admin/nonprofit-research", { allowDenial: false })
      ).toBeTruthy();
      await expect(
        page.getByRole("heading", { name: /donor advisors/i }).first()
      ).toBeVisible({ timeout: 15000 });
      assertNoJsErrors(jsErrors);
    });
  });
});
