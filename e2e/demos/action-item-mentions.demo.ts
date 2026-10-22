import { expect, test } from "@playwright/test";

// biome-ignore lint/suspicious/noExportsInTest: parsed by pr-demo-video workflow for the PR comment
export const demoDescription = `
### Mention another note from a note

Typing \`@\` in a follow-up note opens the admin's other notes across the queue, filtered by project, milestone or what the note says. Picking one inserts a link; clicking the link opens that item's Follow-up tab and scrolls to the mentioned note.
`;

const ADMIN_ADDRESS =
  process.env.DEMO_ADMIN_ADDRESS || "0x5A4830885f12438E00D8f4d98e9Fe083e707698C";

test("mention another note and follow the link", async ({ page }) => {
  test.setTimeout(120_000);
  // Local bypass: the indexer maps any bearer token to TEST_PUBLIC_ADDRESS, and
  // the token manager only reads the stored token when it sees a test runner.
  await page.addInitScript((address) => {
    const win = window as Window & { __e2e?: boolean; Cypress?: unknown };
    win.__e2e = true;
    win.Cypress = {};
    localStorage.setItem("privy:token", "e2e-bypass");
    localStorage.setItem(
      "privy:auth_state",
      JSON.stringify({ authenticated: true, ready: true, user: { wallet: { address } } })
    );
  }, ADMIN_ADDRESS);

  await test.step("Open the queue filtered to items with open notes", async () => {
    await page.goto("/manage/action-items?pendingActionItems=true", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: /follow-up overdue/i })).toBeVisible({
      timeout: 60_000,
    });
    await page.waitForTimeout(1_000);
  });

  await test.step("Open the first item in the queue", async () => {
    await page
      .locator("aside")
      .getByRole("button")
      .filter({ hasText: /late|in review|waiting|unpaid/ })
      .first()
      .click();
    await expect(page.getByRole("tab", { name: "Follow-up", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add note" })).toBeVisible();
    await page.waitForTimeout(1_500);
  });

  await test.step("Start a note and type @ to mention another note", async () => {
    await page.getByRole("button", { name: "Add note" }).click();
    const note = page.getByLabel("Action item note");
    await note.pressSequentially("Same blocker as ", { delay: 40 });
    await note.pressSequentially("@pending", { delay: 90 });
    await expect(page.getByRole("listbox", { name: "Notes to mention" })).toBeVisible();
    await page.waitForTimeout(1_500);
  });

  await test.step("Pick a note from the list", async () => {
    await page.getByRole("option").first().click();
    await expect(page.getByLabel("Action item note")).toHaveValue(/@\[.+\]\(note:/);
    await page.waitForTimeout(1_000);
  });

  await test.step("Save the note with a follow-up date", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await page.locator("#action-item-follow-up").fill(tomorrow);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: /Open this note|@/ }).first()).toBeVisible();
    await page.waitForTimeout(1_500);
  });

  await test.step("Click the mention to jump to the other note", async () => {
    await page.getByTitle("Open this note").first().click();
    await expect(page.locator("li.border-primary-400")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2_500);
  });
});
