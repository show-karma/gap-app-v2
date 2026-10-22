import { expect, type Locator, type Page, test } from "@playwright/test";

// biome-ignore lint/suspicious/noExportsInTest: parsed by pr-demo-video workflow for the PR comment
export const demoDescription = `
### Mention another note from a note

Typing \`@\` in a follow-up note opens the admin's other notes across the queue, filtered by project, milestone or what the note says. Picking one inserts a link; clicking the link opens that item's Follow-up tab and scrolls to the mentioned note. Three cases: a note on another milestone, a note on the same milestone, and a milestone note mentioned from an application.
`;

const ADMIN_ADDRESS =
  process.env.DEMO_ADMIN_ADDRESS || "0x5A4830885f12438E00D8f4d98e9Fe083e707698C";
const DEMO_MARK = "[demo]";
const TYPE_DELAY = 55;

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

async function openFirstRow(page: Page, pattern: RegExp): Promise<void> {
  await page.locator("aside").getByRole("button").filter({ hasText: pattern }).first().click();
  await expect(page.getByRole("tab", { name: "Follow-up", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add note" })).toBeVisible();
}

async function startNote(page: Page, lead: string): Promise<Locator> {
  await page.getByRole("button", { name: "Add note" }).click();
  const note = page.getByLabel("Action item note");
  await note.pressSequentially(`${DEMO_MARK} ${lead} `, { delay: TYPE_DELAY });
  await note.pressSequentially("@", { delay: TYPE_DELAY });
  await expect(page.getByRole("listbox", { name: "Notes to mention" })).toBeVisible();
  await pause(page, 1_200);
  return note;
}

async function saveNote(page: Page): Promise<void> {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await page.locator("#action-item-follow-up").fill(tomorrow);
  await pause(page, 600);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Action item note")).toHaveCount(0);
  await pause(page, 1_500);
}

async function followLink(page: Page): Promise<void> {
  const link = page.getByTitle("Open this note").first();
  await link.hover();
  await pause(page, 800);
  await link.click();
  await expect(page.locator("li.border-primary-400")).toBeVisible({ timeout: 30_000 });
  await pause(page, 3_000);
}

/** The "Project · Milestone" line of a suggestion. */
const locationOf = (option: Locator) => option.locator("span").first().innerText();

test("mention another note and follow the link", async ({ page }) => {
  test.setTimeout(240_000);
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

  let targetLocation = "";
  let sourceLocation = "";

  await test.step("1. Mention a note that lives on another milestone", async () => {
    await page.goto("/manage/action-items?pendingActionItems=true", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: /follow-up overdue/i })).toBeVisible({
      timeout: 60_000,
    });
    await pause(page, 1_500);
    await openFirstRow(page, /late|in review|waiting|unpaid/);
    sourceLocation = (await page.locator("aside [aria-current='true']").innerText()).split("\n")[0];
    await pause(page, 1_500);

    const note = await startNote(page, "Same blocker as");
    await note.pressSequentially("pending", { delay: 90 });
    await pause(page, 1_200);
    const option = page
      .getByRole("option")
      .filter({ hasNotText: sourceLocation })
      .filter({ hasNotText: DEMO_MARK })
      .first();
    targetLocation = await locationOf(option);
    await option.hover();
    await pause(page, 2_000);
    await option.click();
    await pause(page, 1_500);
    await saveNote(page);
    await followLink(page);
  });

  await test.step("2. Mention a note on the same milestone", async () => {
    const project = targetLocation.split(" · ")[0];
    const note = await startNote(page, "Follows up on");
    await note.pressSequentially(project.slice(0, 6), { delay: 90 });
    await pause(page, 1_200);
    const option = page
      .getByRole("option")
      .filter({ hasText: targetLocation })
      .filter({ hasNotText: DEMO_MARK })
      .first();
    await option.hover();
    await pause(page, 2_000);
    await option.click();
    await pause(page, 1_500);
    await saveNote(page);
    await followLink(page);
  });

  await test.step("3. Mention a milestone note from an application", async () => {
    await page.goto("/manage/action-items?kind=application", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab", { name: /^All/ })).toBeVisible({ timeout: 60_000 });
    await pause(page, 1_500);
    await openFirstRow(page, /pending|review|revision|KYB|agreement/i);
    await pause(page, 1_500);

    const note = await startNote(page, "Related to the grantee's milestone chase:");
    await note.pressSequentially(targetLocation.split(" · ")[0].slice(0, 6), { delay: 90 });
    await pause(page, 1_200);
    const option = page
      .getByRole("option")
      .filter({ hasText: targetLocation })
      .filter({ hasNotText: DEMO_MARK })
      .first();
    await option.hover();
    await pause(page, 2_000);
    await option.click();
    await pause(page, 1_500);
    await saveNote(page);
    await followLink(page);
  });
});
