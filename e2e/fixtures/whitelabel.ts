import type { Page } from "@playwright/test";

export interface TenantConfig {
  slug: string;
  domain: string;
  tenantId: string;
  name: string;
  primaryColor: string;
}

export const TENANTS: Record<string, TenantConfig> = {
  optimism: {
    slug: "optimism",
    domain: "app.opgrants.io",
    tenantId: "optimism",
    name: "Optimism",
    primaryColor: "#FF0420",
  },
  filecoin: {
    slug: "filecoin",
    domain: "grants.filecoin.io",
    tenantId: "filecoin",
    name: "Filecoin",
    primaryColor: "#0090ff",
  },
  scroll: {
    slug: "scroll",
    domain: "grantsapp.scroll.io",
    tenantId: "scroll",
    name: "Scroll",
    primaryColor: "#EBC28E",
  },
  polygon: {
    slug: "polygon",
    domain: "founders.polygon.technology",
    tenantId: "polygon",
    name: "Polygon",
    primaryColor: "#8247E5",
  },
};

/** Whether a test server host is this machine (the only place tenant domains are mapped to). */
export function isLocalTestHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname)
  );
}

/**
 * Chromium flag that resolves every tenant domain to the local test server.
 *
 * `setupWhitelabelContext` sends the page to `http://<tenant domain>:<port>`, so
 * the request reaches the proxy with the tenant's real Host header, the same
 * way it does in production. Rewriting the Host header on a localhost request
 * does not work: Chromium drops a Host override passed to `route.continue()`,
 * so every tenant test used to render the main Karma site.
 */
export function tenantHostResolverRules(targetHost: string): string {
  const domains = [...new Set(Object.values(TENANTS).map((t) => t.domain))];
  return `--host-resolver-rules=${domains.map((d) => `MAP ${d} ${targetHost}`).join(", ")}`;
}

/**
 * Set up whitelabel tenant context. Every main-frame navigation to the local
 * server is redirected to the same path on the tenant's domain, which the
 * Chromium launch flag from `tenantHostResolverRules` maps back to the local
 * server. The proxy then reads `request.headers.get("host")`, matches it with
 * `getWhitelabelByDomain()` and rewrites the request to the tenant route tree.
 *
 * Must be called BEFORE navigating to any page.
 */
export async function setupWhitelabelContext(
  page: Page,
  tenantSlug: string,
  baseURL: string
): Promise<TenantConfig> {
  const tenant = TENANTS[tenantSlug];
  if (!tenant) {
    throw new Error(
      `Unknown tenant "${tenantSlug}". Available: ${Object.keys(TENANTS).join(", ")}`
    );
  }

  const base = new URL(baseURL);

  // The login saved in storageState (privy:token and friends) lives in the base
  // origin's localStorage. Copy it to the tenant origin so a test that logs in
  // and then browses a tenant keeps its session there.
  const { origins } = await page.context().storageState();
  const baseStorage = origins.find((o) => o.origin === base.origin)?.localStorage ?? [];
  if (baseStorage.length > 0) {
    await page.addInitScript(
      ({ domain, items }) => {
        if (window.location.hostname !== domain) return;
        for (const { name, value } of items) {
          if (window.localStorage.getItem(name) === null) {
            window.localStorage.setItem(name, value);
          }
        }
      },
      { domain: tenant.domain, items: baseStorage }
    );
  }

  await page.route(`${base.origin}/**`, async (route) => {
    const request = route.request();
    if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) {
      await route.continue();
      return;
    }
    const target = new URL(request.url());
    target.hostname = tenant.domain;
    await route.fulfill({ status: 307, headers: { location: target.toString() } });
  });

  return tenant;
}
