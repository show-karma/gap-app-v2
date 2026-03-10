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

/**
 * Set up whitelabel tenant context by intercepting requests and adding
 * the Host header that triggers the middleware's whitelabel path.
 *
 * The middleware (`middleware.ts`) reads `request.headers.get("host")`
 * and matches it against `getWhitelabelByDomain()`. When matched, it:
 * 1. Sets `x-is-whitelabel`, `x-community-slug`, `x-tenant-id` headers
 * 2. Rewrites the path to `/community/{slug}/...`
 *
 * Must be called BEFORE navigating to any page.
 */
export async function setupWhitelabelContext(
  page: Page,
  tenantSlug: string
): Promise<TenantConfig> {
  const tenant = TENANTS[tenantSlug];
  if (!tenant) {
    throw new Error(
      `Unknown tenant "${tenantSlug}". Available: ${Object.keys(TENANTS).join(", ")}`
    );
  }

  // Intercept navigation requests to localhost and add the whitelabel Host header.
  // This makes the Next.js middleware believe the request came from the tenant domain.
  await page.route("http://localhost:3000/**", async (route) => {
    const request = route.request();
    const headers = {
      ...request.headers(),
      host: tenant.domain,
    };
    await route.continue({ headers });
  });

  return tenant;
}
