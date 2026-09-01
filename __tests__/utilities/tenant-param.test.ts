import fs from "node:fs";
import path from "node:path";
import { CANONICAL_HOST, STAGING_HOST } from "@/utilities/domains";
import {
  isKnownTenantParam,
  isTenantExemptPath,
  isTenantRoutePath,
  KARMA_TENANT_PARAM,
  listTenantParams,
  resolveTenantParam,
  resolveWhitelabelFromTenantParam,
  TENANT_NOT_FOUND_SEGMENT,
  tenantNotFoundPathname,
  tenantRewritePathname,
} from "@/utilities/tenant-param";
import { WHITELABEL_DOMAINS } from "@/utilities/whitelabel-config";

const primaryWhitelabel = WHITELABEL_DOMAINS[0];
if (!primaryWhitelabel) {
  throw new Error("No whitelabel domain configured for tenant-param tests.");
}

describe("resolveTenantParam", () => {
  it("resolves every non-whitelabel host to the Karma param", () => {
    for (const host of [
      CANONICAL_HOST,
      STAGING_HOST,
      "karmahq.org",
      "gap.karmahq.xyz",
      "localhost:3000",
      "gap-app-v2-git-feature.vercel.app",
    ]) {
      expect(resolveTenantParam(host)).toBe(KARMA_TENANT_PARAM);
    }
  });

  it("resolves a whitelabel host to its config domain, not its community slug", () => {
    expect(resolveTenantParam(primaryWhitelabel.domain)).toBe(primaryWhitelabel.domain);
    expect(resolveTenantParam(primaryWhitelabel.domain)).not.toBe(primaryWhitelabel.communitySlug);
  });

  it("gives the production and test domains of one community distinct params", () => {
    // Both point at the optimism community; only the domain distinguishes their
    // metadataBase, so collapsing them onto the slug would break canonicals.
    expect(resolveTenantParam("app.opgrants.io")).toBe("app.opgrants.io");
    expect(resolveTenantParam("testapp.opgrants.io")).toBe("testapp.opgrants.io");
  });

  it("normalizes case and port like the host matcher does", () => {
    expect(resolveTenantParam(`${primaryWhitelabel.domain.toUpperCase()}:3000`)).toBe(
      primaryWhitelabel.domain
    );
  });

  it("does not match a host that merely ends with a whitelabel domain", () => {
    expect(resolveTenantParam(`evil${primaryWhitelabel.domain}`)).toBe(KARMA_TENANT_PARAM);
    expect(resolveTenantParam(`${primaryWhitelabel.domain}.evil.com`)).toBe(KARMA_TENANT_PARAM);
    expect(resolveTenantParam(`fake-${primaryWhitelabel.domain}`)).toBe(KARMA_TENANT_PARAM);
  });

  it("resolves an empty or missing host to the Karma param", () => {
    expect(resolveTenantParam("")).toBe(KARMA_TENANT_PARAM);
  });
});

describe("listTenantParams", () => {
  it("starts with the Karma param and covers every configured whitelabel domain", () => {
    const params = listTenantParams();

    expect(params[0]).toBe(KARMA_TENANT_PARAM);
    for (const config of WHITELABEL_DOMAINS) {
      expect(params).toContain(config.domain.toLowerCase());
    }
  });

  it("returns no duplicates", () => {
    const params = listTenantParams();

    expect(new Set(params).size).toBe(params.length);
  });

  it("only lists values the root layout accepts", () => {
    for (const value of listTenantParams()) {
      expect(isKnownTenantParam(value)).toBe(true);
    }
  });

  it("includes whitelabel domains injected through WHITELABEL_EXTRA_DOMAINS_JSON", async () => {
    // WHITELABEL_DOMAINS is built once at module load, so the env has to be in
    // place before the module graph is imported.
    vi.resetModules();
    vi.stubEnv(
      "WHITELABEL_EXTRA_DOMAINS_JSON",
      JSON.stringify([{ domain: "Grants.Example.Org", communitySlug: "example", name: "Example" }])
    );

    const tenantParam = await import("@/utilities/tenant-param");

    expect(tenantParam.listTenantParams()).toContain("grants.example.org");
    expect(tenantParam.resolveTenantParam("grants.example.org")).toBe("grants.example.org");
    expect(tenantParam.resolveWhitelabelFromTenantParam("grants.example.org")?.communitySlug).toBe(
      "example"
    );

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("resolveWhitelabelFromTenantParam", () => {
  it("round-trips every host through resolveTenantParam back to its own config", () => {
    for (const config of WHITELABEL_DOMAINS) {
      expect(resolveWhitelabelFromTenantParam(resolveTenantParam(config.domain))).toEqual(config);
    }
  });

  it("returns null for the Karma param", () => {
    expect(resolveWhitelabelFromTenantParam(KARMA_TENANT_PARAM)).toBeNull();
  });

  it("returns null for unknown values", () => {
    for (const value of ["", "example.com", "optimism", "unknown-tenant", "../karma"]) {
      expect(resolveWhitelabelFromTenantParam(value)).toBeNull();
    }
  });

  it("does not accept a value that merely contains a configured domain", () => {
    expect(resolveWhitelabelFromTenantParam(`evil${primaryWhitelabel.domain}`)).toBeNull();
    expect(resolveWhitelabelFromTenantParam(`${primaryWhitelabel.domain}.evil.com`)).toBeNull();
    expect(resolveWhitelabelFromTenantParam(`${primaryWhitelabel.domain}:443`)).toBeNull();
  });
});

describe("isKnownTenantParam", () => {
  it("accepts the Karma param and every whitelabel domain", () => {
    expect(isKnownTenantParam(KARMA_TENANT_PARAM)).toBe(true);
    expect(isKnownTenantParam(primaryWhitelabel.domain)).toBe(true);
  });

  it("rejects community slugs and unknown values", () => {
    expect(isKnownTenantParam(primaryWhitelabel.communitySlug)).toBe(false);
    expect(isKnownTenantParam("nope")).toBe(false);
    expect(isKnownTenantParam("")).toBe(false);
  });
});

describe("isTenantRoutePath", () => {
  it("matches the prefix and anything under it, case-insensitively", () => {
    expect(isTenantRoutePath("/t")).toBe(true);
    expect(isTenantRoutePath("/t/")).toBe(true);
    expect(isTenantRoutePath("/t/karma/about")).toBe(true);
    expect(isTenantRoutePath("/T/karma/about")).toBe(true);
  });

  it("does not match paths that merely start with the letter t", () => {
    for (const path of ["/tenants/optimism/logo.png", "/terms-and-conditions", "/team", "/"]) {
      expect(isTenantRoutePath(path)).toBe(false);
    }
  });
});

describe("isTenantExemptPath", () => {
  it("exempts route handlers and metadata routes", () => {
    for (const path of [
      "/api/geo",
      "/.well-known/mcp.json",
      "/sitemap.xml",
      "/sitemap-index.xml",
      "/sitemap_index.xml",
      "/extended-sitemap.xml",
      "/sitemaps/static/sitemap.xml",
      "/sitemaps/projects/sitemap/2",
      "/openapi.json",
      "/robots.txt",
      "/manifest.json",
      "/favicon.ico",
      "/monitoring",
    ]) {
      expect(isTenantExemptPath(path)).toBe(true);
    }
  });

  it("exempts Next internals and public asset directories", () => {
    for (const path of [
      "/_next/static/chunks/main.js",
      "/_vercel/insights/view",
      "/assets/hero.png",
      "/images/logo.svg",
      "/logos/optimism.png",
      "/logo/karma.svg",
      "/icons/apple-touch-icon.png",
      "/fonts/Inter.woff2",
      "/tenants/optimism/cover.jpg",
    ]) {
      expect(isTenantExemptPath(path)).toBe(true);
    }
  });

  it("does not exempt page routes", () => {
    for (const path of [
      "/",
      "/about",
      "/communities",
      "/community/optimism/funding-opportunities",
      "/project/my-project",
      "/blog/hello-world",
      "/knowledge",
      "/dashboard/projects",
      "/admin/studio/structure",
      "/programs/123",
    ]) {
      expect(isTenantExemptPath(path)).toBe(false);
    }
  });

  it("does not treat a dotted slug as a static asset", () => {
    expect(isTenantExemptPath("/project/vitalik.eth")).toBe(false);
    expect(isTenantExemptPath("/community/foo.bar")).toBe(false);
  });

  it("does not exempt a page route that merely starts with an exempt word", () => {
    for (const path of ["/apiary", "/images-of-impact", "/monitoring-tools", "/logotype"]) {
      expect(isTenantExemptPath(path)).toBe(false);
    }
  });
});

describe("tenantRewritePathname", () => {
  it("maps the root to the bare tenant segment", () => {
    expect(tenantRewritePathname(KARMA_TENANT_PARAM, "/")).toBe("/t/karma");
  });

  it("prefixes any other path", () => {
    expect(tenantRewritePathname(KARMA_TENANT_PARAM, "/about")).toBe("/t/karma/about");
    expect(tenantRewritePathname("app.opgrants.io", "/community/optimism/programs/1")).toBe(
      "/t/app.opgrants.io/community/optimism/programs/1"
    );
  });

  it("drops a trailing slash so the target matches the route tree", () => {
    expect(tenantRewritePathname(KARMA_TENANT_PARAM, "/projects/")).toBe("/t/karma/projects");
  });

  it("leaves the dots and hyphens of a domain param unescaped", () => {
    expect(tenantRewritePathname("founders.polygon.technology", "/about")).toBe(
      "/t/founders.polygon.technology/about"
    );
  });
});

describe("tenantNotFoundPathname", () => {
  it("builds a path under the requested tenant", () => {
    expect(tenantNotFoundPathname(KARMA_TENANT_PARAM)).toBe(
      `/t/${KARMA_TENANT_PARAM}/${TENANT_NOT_FOUND_SEGMENT}`
    );
    expect(tenantNotFoundPathname("app.opgrants.io")).toBe(
      `/t/app.opgrants.io/${TENANT_NOT_FOUND_SEGMENT}`
    );
  });

  it("is itself inside the blocked prefix, so it can never be requested directly", () => {
    expect(isTenantRoutePath(tenantNotFoundPathname(KARMA_TENANT_PARAM))).toBe(true);
  });

  it("points at a real route that throws notFound()", () => {
    // Load-bearing: an UNMATCHED path is answered by the ROOT not-found
    // boundary, and there is no root-level app/not-found.tsx now that the page
    // tree lives under app/t/[tenant]/ — Next would serve its own built-in 404
    // with none of our chrome. Only a real route under this layout renders
    // app/t/[tenant]/not-found.tsx.
    const page = path.join(
      process.cwd(),
      "app",
      "t",
      "[tenant]",
      TENANT_NOT_FOUND_SEGMENT,
      "page.tsx"
    );

    expect(fs.existsSync(page)).toBe(true);
    expect(fs.readFileSync(page, "utf-8")).toContain("notFound()");
  });

  it("keeps a not-found boundary at the root of the tenant tree to render into", () => {
    expect(fs.existsSync(path.join(process.cwd(), "app", "t", "[tenant]", "not-found.tsx"))).toBe(
      true
    );
  });
});
