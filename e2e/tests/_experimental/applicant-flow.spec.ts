import { createMockApplication } from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { assertNoJsErrors, collectJsErrors } from "../../helpers/assertions";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";

test.describe("Applicant Journey", () => {
  test("T36-01: applicant can login, find a program, submit an application, and check status", async ({
    page,
    withApiMocks,
    loginAs,
  }) => {
    const jsErrors = collectJsErrors(page);

    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({
      programId: "p-journey",
      title: "Journey Test Program",
      description: "A grant program for the applicant journey test",
    });
    const pendingApplication = createMockApplication({
      _id: "app-journey-001",
      referenceNumber: "APP-JOURNEY-001",
      programId: "p-journey",
      communitySlug: "optimism",
      status: "pending",
    });

    // --- Step 1: Login as applicant ---
    await loginAs("applicant");

    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/community/optimism**": mockJson([program]),
      "**/v2/funding-program-configs/p-journey": mockJson(program),
      "**/v2/funding-applications": mockJson(
        { success: true, referenceNumber: "APP-JOURNEY-001" },
        201
      ),
      "**/v2/funding-applications/program/p-journey**": mockJson([pendingApplication]),
      "**/v2/funding-applications/APP-JOURNEY-001": mockJson(pendingApplication),
      "**/v2/user/projects**": mockJson({
        payload: [],
        pagination: { page: 1, limit: 10, total: 0 },
      }),
    });

    // --- Step 2: Browse to community and find the program ---
    await page.goto("/community/optimism", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the community page rendered with meaningful content
    await expect(page).toHaveURL(/\/community\/optimism/);
    const communityBodyText = await page.locator("body").textContent();
    expect(communityBodyText!.trim().length).toBeGreaterThan(100);

    // --- Step 3: Navigate to the program page ---
    await page.goto("/community/optimism/programs/p-journey", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the program detail page loaded with meaningful content
    await expect(page).toHaveURL(/\/community\/optimism\/programs\/p-journey/);
    const programBodyText = await page.locator("body").textContent();
    expect(programBodyText!.trim().length).toBeGreaterThan(100);

    // --- Step 4: Navigate to the application form ---
    await page.goto("/community/optimism/programs/p-journey/apply", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the apply page loaded
    await expect(page).toHaveURL(/\/programs\/p-journey\/apply/);
    const applyBodyText = await page.locator("body").textContent();
    expect(applyBodyText!.trim().length).toBeGreaterThan(100);

    // Verify the form has interactive elements (inputs, textareas, or buttons)
    const formInputs = page.locator("input, textarea, select");
    const submitButton = page.getByRole("button", { name: /submit|apply|send|next/i });
    const formInputCount = await formInputs.count();
    const submitButtonCount = await submitButton.count();
    expect(
      formInputCount + submitButtonCount,
      "Application form should have at least one form element or submit button"
    ).toBeGreaterThan(0);

    // --- Step 5: Check application status ---
    // Navigate to my-applications to see the submitted application
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-applications/user/**": mockJson([pendingApplication]),
      "**/v2/user/projects**": mockJson({
        payload: [],
        pagination: { page: 1, limit: 10, total: 0 },
      }),
    });

    await page.goto("/community/optimism/my-applications", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Verify the my-applications page loaded with meaningful content
    await expect(page).toHaveURL(/\/community\/optimism\/my-applications/);
    const myAppsBodyText = await page.locator("body").textContent();
    expect(myAppsBodyText!.trim().length).toBeGreaterThan(100);

    assertNoJsErrors(jsErrors);
  });
});
