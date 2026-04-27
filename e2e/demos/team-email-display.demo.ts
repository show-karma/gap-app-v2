import { expect, test } from "@playwright/test";

// biome-ignore lint/suspicious/noExportsInTest: parsed by pr-demo-video workflow for the PR comment
export const demoDescription = `
### Authorized team-member emails on the About / Team page

This change adds a privacy-aware email row to each team-member card.

**How it works**

- For **public visitors** the card looks the same as before — name, address, socials, bio. No email is rendered.
- Once a viewer is **signed in**, \`useTeamProfiles\` calls the backend's authorized lookup and merges any returned emails into the team profiles. The card now renders a \`mailto:\` anchor right under the address; clicking it opens the user's default email client.
- If the authorized lookup fails (network error, 5xx, etc.) the hook quietly falls back to the public profiles and reports the failure to Sentry via \`errorManager\`, so we keep observability without breaking the page.
- The query key includes the \`authenticated\` flag, so signing in/out invalidates the cache and the email row disappears immediately on logout.

The recording below captures a public visit, then simulates the authorized response and shows the email row appearing as a clickable mailto link.
`;

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
      type QueryEntry = { queryKey: unknown[] };
      type QueryClientLite = {
        getQueryCache: () => { getAll: () => QueryEntry[] };
        setQueryData: (key: unknown[], data: unknown) => void;
      };
      type Fiber = {
        return: Fiber | null;
        memoizedProps?: { client?: QueryClientLite };
      };

      const findQueryClient = (): QueryClientLite | null => {
        const root = document.querySelector('[data-testid="team-member-card"]');
        if (!root) return null;
        const fiberKey = Object.keys(root).find((k) => k.startsWith("__reactFiber"));
        if (!fiberKey) return null;
        let cur: Fiber | null =
          (root as unknown as Record<string, Fiber | undefined>)[fiberKey] ?? null;
        while (cur) {
          const client = cur.memoizedProps?.client;
          if (client?.getQueryCache) return client;
          cur = cur.return;
        }
        return null;
      };

      const qc = findQueryClient();
      if (!qc) throw new Error("QueryClient not found in fiber tree");

      const matches = qc
        .getQueryCache()
        .getAll()
        .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === "contributor-profiles");
      if (matches.length === 0) throw new Error("No contributor-profiles query in cache");

      // Pick the active query (the one with a non-empty addresses array)
      const active =
        matches.find((q) => {
          const addresses = q.queryKey[1];
          return Array.isArray(addresses) && addresses.length > 0;
        }) ?? matches[0];
      const addresses = active.queryKey[1];
      const recipient =
        Array.isArray(addresses) && addresses.length > 0 ? String(addresses[0]) : "";

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
