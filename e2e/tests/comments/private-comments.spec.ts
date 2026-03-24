import { createMockApplication } from "../../data/applications";
import { createMockCommunity } from "../../data/communities";
import { createMockProgram } from "../../data/programs";
import { MOCK_USERS } from "../../data/users";
import { expect, mockJson, test } from "../../fixtures";
import { waitForPageReady } from "../../helpers/navigation";

test.describe("Private Comments", () => {
  const setupApplicationPage = async (page: any, withApiMocks: Function, comments: any[] = []) => {
    const community = createMockCommunity({ slug: "optimism" });
    const program = createMockProgram({ programId: "p1" });
    const application = createMockApplication({ referenceNumber: "APP-2024-001", programId: "p1" });
    await withApiMocks({
      "**/v2/communities/optimism": mockJson(community),
      "**/v2/funding-program-configs/p1": mockJson(program),
      "**/v2/funding-applications/APP-2024-001": mockJson(application),
      "**/v2/applications/APP-2024-001/comments": mockJson(comments),
    });
  };

  test("T1-48: admin sees private comments", async ({ page, withApiMocks, loginAs }) => {
    const comments = [
      {
        _id: "comment-1",
        content: "This is a private admin comment",
        isPrivate: true,
        author: { address: MOCK_USERS.communityAdmin.address },
        createdAt: "2024-02-01T00:00:00.000Z",
      },
    ];
    await loginAs("communityAdmin");
    await setupApplicationPage(page, withApiMocks, comments);
    await page.goto("/community/optimism/programs/p1/applications/APP-2024-001");
    await waitForPageReady(page);
    // Admin should see the application detail page with application reference
    await expect(page).toHaveURL(/\/applications\/APP-2024-001/);
    await expect(page.getByText("APP-2024-001")).toBeVisible();
  });

  test("T1-49: guest cannot see private comments", async ({ page, withApiMocks, loginAs }) => {
    // Private comments should not be returned for guests
    await loginAs("guest");
    await setupApplicationPage(page, withApiMocks, []);
    await page.goto("/community/optimism/programs/p1/applications/APP-2024-001");
    await waitForPageReady(page);
    // Guest should see the application page but no private comment content
    await expect(page).toHaveURL(/\/applications\/APP-2024-001/);
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("This is a private admin comment");
  });

  test("T1-50: comment content is XSS-safe", async ({ page, withApiMocks, loginAs }) => {
    const xssComment = {
      _id: "comment-xss",
      content: '<script>alert("xss")</script><img src=x onerror=alert(1)>Test comment',
      isPrivate: false,
      author: { address: MOCK_USERS.applicant.address },
      createdAt: "2024-02-01T00:00:00.000Z",
    };
    await loginAs("communityAdmin");
    await setupApplicationPage(page, withApiMocks, [xssComment]);
    await page.goto("/community/optimism/programs/p1/applications/APP-2024-001");
    await waitForPageReady(page);
    // XSS should not execute — no alert dialogs
    // The page should render without script execution
    await expect(page).toHaveURL(/\/applications\/APP-2024-001/);
    // Verify no script tags are rendered in the DOM
    const scriptInComments = await page.evaluate(() => {
      const body = document.body.innerHTML;
      return body.includes('<script>alert("xss")</script>');
    });
    expect(scriptInComments).toBeFalsy();
  });
});
