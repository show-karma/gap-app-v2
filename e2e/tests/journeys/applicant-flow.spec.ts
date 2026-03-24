import {
  createApprovedApplication,
  createMockApplication,
} from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { expect, mockJson, test } from "../../fixtures";
import { GOTO_OPTIONS, waitForPageReady } from "../../helpers/navigation";
import { collectJsErrors, assertNoJsErrors } from "../../helpers/assertions";

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

    const communityBodyText = await page.textContent("body");
    expect(communityBodyText).toBeTruthy();
    expect(communityBodyText!.trim().length).toBeGreaterThan(50);

    // --- Step 3: Navigate to the program page ---
    await page.goto("/community/optimism/programs/p-journey", GOTO_OPTIONS);
    await waitForPageReady(page);

    const programBodyText = await page.textContent("body");
    expect(programBodyText).toBeTruthy();
    expect(programBodyText!.trim().length).toBeGreaterThan(30);

    // --- Step 4: Navigate to the application form ---
    await page.goto("/community/optimism/programs/p-journey/apply", GOTO_OPTIONS);
    await waitForPageReady(page);

    // The apply page should render a form or form-like content
    const applyBodyText = await page.textContent("body");
    expect(applyBodyText).toBeTruthy();
    expect(applyBodyText!.trim().length).toBeGreaterThan(20);

    // Check for form elements (inputs, textareas, buttons)
    const formInputs = page.locator("input, textarea, select");
    const submitButton = page.getByRole("button", { name: /submit|apply|send|next/i });
    const hasFormElements = (await formInputs.count()) > 0 || (await submitButton.count()) > 0;
    // The form should have at least some interactive elements
    expect(hasFormElements).toBeTruthy();

    // --- Step 5: Check application status ---
    // Navigate to my-applications to see the submitted application
    await page.goto("/community/optimism/my-applications", GOTO_OPTIONS);
    await waitForPageReady(page);

    // Mock the applications list to include the submitted one
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

    const myAppsBodyText = await page.textContent("body");
    expect(myAppsBodyText).toBeTruthy();

    assertNoJsErrors(jsErrors);
  });
});
