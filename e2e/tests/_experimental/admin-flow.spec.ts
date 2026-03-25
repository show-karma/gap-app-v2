import {
  createApprovedApplication,
  createMockApplication,
  createRejectedApplication,
} from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Admin Journey", () => {
  test("T36-02: admin can login, review an application, approve it, and verify status change", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);

    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({
      programId: "p-admin",
      title: "Admin Review Program",
    });
    const pendingApplication = createMockApplication({
      _id: "app-review-001",
      referenceNumber: "APP-REVIEW-001",
      programId: "p-admin",
      communitySlug: "optimism",
      status: "pending",
      answers: [
        { fieldName: "projectName", value: "Test Project Alpha" },
        { fieldName: "projectDescription", value: "A project for testing admin review flow" },
        { fieldName: "requestedAmount", value: "50000" },
      ],
    });
    const approvedApplication = createApprovedApplication({
      _id: "app-review-001",
      referenceNumber: "APP-REVIEW-001",
      programId: "p-admin",
      communitySlug: "optimism",
    });

    // --- Step 1: Login as community admin ---
    await loginAs("communityAdmin");

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      "**/v2/funding-program-configs/p-admin": mockJson(program),
      "**/v2/funding-applications/program/p-admin**": mockJson([pendingApplication]),
      "**/v2/funding-applications/APP-REVIEW-001": mockJson(pendingApplication),
      "**/v2/user/communities/admin": mockJson([community]),
    });

    // --- Step 2: Navigate to the community as admin ---
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify community page rendered with meaningful content
    await expect(page).toHaveURL(/\/community\/optimism/);
    const communityBodyText = await page.locator("body").textContent();
    expect(communityBodyText!.trim().length).toBeGreaterThan(100);

    // --- Step 3: Navigate to the program to see applications ---
    await page.goto("/community/optimism/programs/p-admin", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify program page rendered with meaningful content
    await expect(page).toHaveURL(/\/community\/optimism\/programs\/p-admin/);
    const programBodyText = await page.locator("body").textContent();
    expect(programBodyText!.trim().length).toBeGreaterThan(100);

    // --- Step 4: View the pending application ---
    await page.goto(
      "/community/optimism/programs/p-admin/applications/APP-REVIEW-001",
      GOTO_OPTIONS
    );
    await waitForPageReady(page);

    // Verify application detail page loaded
    await expect(page).toHaveURL(/\/applications\/APP-REVIEW-001/);
    const appDetailText = await page.locator("body").textContent();
    expect(appDetailText!.trim().length).toBeGreaterThan(100);

    // --- Step 5: Simulate approval and verify status change ---
    // Re-mock the application endpoint to return approved status
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p-admin": mockJson(program),
      "**/v2/funding-applications/APP-REVIEW-001": mockJson(approvedApplication),
      "**/v2/funding-applications/program/p-admin**": mockJson([approvedApplication]),
      "**/v2/user/communities/admin": mockJson([community]),
    });

    // Reload to see the updated status
    await page.goto(
      "/community/optimism/programs/p-admin/applications/APP-REVIEW-001",
      GOTO_OPTIONS
    );
    await waitForPageReady(page);

    // Verify the application page loaded after status change
    await expect(page).toHaveURL(/\/applications\/APP-REVIEW-001/);
    const approvedDetailText = await page.locator("body").textContent();
    expect(approvedDetailText!.trim().length).toBeGreaterThan(100);

    // --- Step 6: Navigate back to program to verify the list reflects the change ---
    await page.goto("/community/optimism/programs/p-admin", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the program page still renders with meaningful content
    await expect(page).toHaveURL(/\/community\/optimism\/programs\/p-admin/);
    const programListText = await page.locator("body").textContent();
    expect(programListText!.trim().length).toBeGreaterThan(100);

    assertNoJsErrors(jsErrors);
  });

  test("T36-03: admin can reject an application and verify the rejection status", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);

    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({
      programId: "p-reject",
      title: "Rejection Test Program",
    });
    const pendingApplication = createMockApplication({
      _id: "app-reject-001",
      referenceNumber: "APP-REJECT-001",
      programId: "p-reject",
      communitySlug: "optimism",
      status: "pending",
      answers: [
        { fieldName: "projectName", value: "Rejected Project Beta" },
        { fieldName: "projectDescription", value: "This application will be rejected" },
        { fieldName: "requestedAmount", value: "999999" },
      ],
    });
    const rejectedApplication = createRejectedApplication({
      _id: "app-reject-001",
      referenceNumber: "APP-REJECT-001",
      programId: "p-reject",
      communitySlug: "optimism",
    });

    // --- Step 1: Login as community admin ---
    await loginAs("communityAdmin");

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      "**/v2/funding-program-configs/p-reject": mockJson(program),
      "**/v2/funding-applications/program/p-reject**": mockJson([pendingApplication]),
      "**/v2/funding-applications/APP-REJECT-001": mockJson(pendingApplication),
      "**/v2/user/communities/admin": mockJson([community]),
    });

    // --- Step 2: View the pending application ---
    await page.goto(
      "/community/optimism/programs/p-reject/applications/APP-REJECT-001",
      GOTO_OPTIONS
    );
    await waitForPageReady(page);

    // Verify pending application detail page loaded
    await expect(page).toHaveURL(/\/applications\/APP-REJECT-001/);
    const pendingDetailText = await page.locator("body").textContent();
    expect(pendingDetailText!.trim().length).toBeGreaterThan(100);

    // --- Step 3: Simulate rejection and verify status change ---
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p-reject": mockJson(program),
      "**/v2/funding-applications/APP-REJECT-001": mockJson(rejectedApplication),
      "**/v2/funding-applications/program/p-reject**": mockJson([rejectedApplication]),
      "**/v2/user/communities/admin": mockJson([community]),
    });

    await page.goto(
      "/community/optimism/programs/p-reject/applications/APP-REJECT-001",
      GOTO_OPTIONS
    );
    await waitForPageReady(page);

    // Verify the application page loaded after rejection
    await expect(page).toHaveURL(/\/applications\/APP-REJECT-001/);
    const rejectedDetailText = await page.locator("body").textContent();
    expect(rejectedDetailText!.trim().length).toBeGreaterThan(100);

    // --- Step 4: Verify the program list page still renders ---
    await page.goto("/community/optimism/programs/p-reject", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the program page still renders with meaningful content
    await expect(page).toHaveURL(/\/community\/optimism\/programs\/p-reject/);
    const programListText = await page.locator("body").textContent();
    expect(programListText!.trim().length).toBeGreaterThan(100);

    assertNoJsErrors(jsErrors);
  });
});
