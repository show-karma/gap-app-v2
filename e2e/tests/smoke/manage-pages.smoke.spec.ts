import { MOCK_COMMUNITIES } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

const community = MOCK_COMMUNITIES.optimism;
const program = createMockProgram({
  programId: "program-manage-001",
  title: "Manage Test Program",
});

function manageMocks() {
  return {
    "**/v2/communities/optimism": mockJson(community),
    "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
    "**/v2/funding-program-configs/program-manage-001": mockJson(program),
    "**/v2/funding-applications/program/program-manage-001**": mockJson([]),
    "**/v2/payouts/**": mockJson([]),
    "**/v2/tracks/**": mockJson([]),
    "**/v2/categories/**": mockJson([]),
    "**/v2/user/communities/admin**": mockJson([community]),
  };
}

test.describe("Smoke Tests — Manage Pages", () => {
  test("T-MGMT-01: manage landing page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage", GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText("Optimism")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-02: control center page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage/control-center", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should render content, heading, or loading skeleton (auth gated)
    const hasContent = await Promise.race([
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/control center|settings/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-03: funding platform page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage/funding-platform", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Page should render program content, funding text, or loading skeleton
    const hasContent = await Promise.race([
      page
        .getByText(/program|funding|application/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-04: program setup page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto(
      "/community/optimism/manage/funding-platform/program-manage-001/setup",
      GOTO_OPTIONS
    );
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText("Manage Test Program")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByText(/setup|configuration/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-05: program applications page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto(
      "/community/optimism/manage/funding-platform/program-manage-001/applications",
      GOTO_OPTIONS
    );
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText(/application/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-06: edit categories page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage/edit-categories", GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText(/categor/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-07: edit projects page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage/edit-projects", GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText(/project/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-08: milestones report page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage/milestones-report", GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText(/milestone/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-09: payouts page loads or redirects", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage/payouts", GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText(/payout/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);

    const wasRedirected = !page.url().includes("/payouts");

    expect(hasContent || wasRedirected).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });

  test("T-MGMT-10: KYC settings page loads", async ({ page, withApiMocks, loginAs }) => {
    const jsErrors = collectJsErrors(page);

    await withApiMocks(manageMocks());
    await loginAs("communityAdmin", { communityId: "optimism" });
    await page.goto("/community/optimism/manage/kyc-settings", GOTO_OPTIONS);
    await waitForPageReady(page);

    const hasContent = await Promise.race([
      page
        .getByText(/kyc|verification/i)
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator("[class*='skeleton'], [class*='Skeleton'], [class*='animate-pulse']")
        .first()
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });
});
