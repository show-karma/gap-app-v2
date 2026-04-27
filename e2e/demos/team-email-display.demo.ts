import { expect, test } from "@playwright/test";

/**
 * Records a demo of the authorized team email feature.
 *
 * The feature: on a project's About/Team page, signed-in viewers see each
 * team member's email (when the backend authorized lookup returns one);
 * public visitors do not.
 *
 * To make the recording self-contained and avoid relying on test
 * credentials, we drive the React Query cache directly to swap in an
 * authorized profile, mirroring what the real flow does once a user signs
 * in. The component code path being exercised is identical.
 */

const PROJECT_SLUG = process.env.DEMO_PROJECT_SLUG || "bankless-academy-397";

test("team member email — public vs. authorized view", async ({ page }) => {
  await test.step("Open the project's About page (public visitor)", async () => {
    await page.goto(`/project/${PROJECT_SLUG}/about`, {
      waitUntil: "domcontentloaded",
    });
    const card = page.getByTestId("team-member-card").first();
    await expect(card).toBeVisible({ timeout: 30_000 });
  });

  await test.step("Confirm email is hidden from public viewers", async () => {
    await expect(page.getByTestId("member-email")).toHaveCount(0);
    await page.waitForTimeout(1_500);
  });

  await test.step("Simulate the authorized backend returning an email", async () => {
    await page.evaluate(() => {
      const findQueryClient = () => {
        const root = document.querySelector('[data-testid="team-member-card"]');
        if (!root) return null;
        const fiberKey = Object.keys(root).find((k) => k.startsWith("__reactFiber"));
        if (!fiberKey) return null;
        // biome-ignore lint/suspicious/noExplicitAny: walking React internals
        let cur: any = (root as any)[fiberKey];
        while (cur) {
          if (cur.memoizedProps?.client?.getQueryCache) return cur.memoizedProps.client;
          cur = cur.return;
        }
        return null;
      };

      // biome-ignore lint/suspicious/noExplicitAny: query client API
      const qc = findQueryClient() as any;
      if (!qc) throw new Error("QueryClient not found in fiber tree");

      const matches = qc
        .getQueryCache()
        .getAll()
        .filter(
          // biome-ignore lint/suspicious/noExplicitAny: query shape
          (q: any) => Array.isArray(q.queryKey) && q.queryKey[0] === "contributor-profiles"
        );
      if (matches.length === 0) throw new Error("No contributor-profiles query in cache");

      // Pick the active query (the one with a non-empty addresses array)
      const active =
        // biome-ignore lint/suspicious/noExplicitAny: query shape
        matches.find((q: any) => Array.isArray(q.queryKey?.[1]) && q.queryKey[1].length > 0) ??
        matches[0];
      const [, addresses] = active.queryKey;
      const recipient = (addresses?.[0] ?? "").toString();

      qc.setQueryData(active.queryKey, [
        {
          recipient,
          data: {
            name: "Ada Lovelace",
            email: "ada@example.com",
            aboutMe: "Project lead",
          },
        },
      ]);
    });
  });

  await test.step("Email appears as a clickable mailto link", async () => {
    const emailLink = page.getByTestId("member-email");
    await expect(emailLink).toBeVisible({ timeout: 5_000 });
    await expect(emailLink).toHaveAttribute("href", "mailto:ada@example.com");
    await emailLink.hover();
    await page.waitForTimeout(2_000);
  });
});
