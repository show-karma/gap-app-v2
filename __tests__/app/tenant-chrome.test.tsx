import "@testing-library/jest-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import {
  TenantFooter,
  TenantJsonLd,
  TenantNavbar,
  TenantThemeStyle,
} from "@/src/components/layout/tenant-chrome";

/**
 * The host-dependent chrome. Each piece takes the whitelabel promise directly
 * rather than reading WhitelabelProvider's context, so it can be given its own
 * Suspense boundary later without dragging the page behind one.
 */

vi.mock("@/src/components/footer/footer", () => ({
  __esModule: true,
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock("@/src/components/footer/whitelabel-footer", () => ({
  __esModule: true,
  WhitelabelFooter: () => <footer data-testid="whitelabel-footer" />,
}));

vi.mock("@/src/components/navbar/navbar", () => ({
  Navbar: () => <header data-testid="header" />,
}));

vi.mock("@/src/components/navbar/whitelabel-navbar", () => ({
  WhitelabelNavbar: () => <header data-testid="whitelabel-navbar" />,
}));

vi.mock("@/components/Seo/OrganizationJsonLd", () => ({
  OrganizationJsonLd: () => <div data-testid="organization-json-ld" />,
}));

const MAIN_DOMAIN = {
  isWhitelabel: false,
  communitySlug: null,
  config: null,
  tenantConfig: null,
};

const WHITELABEL = {
  isWhitelabel: true,
  communitySlug: "optimism",
  config: {
    domain: "app.opgrants.io",
    communitySlug: "optimism",
    name: "Optimism",
    theme: { primaryColor: "#FF0420", buttonTextColor: "#FFFFFF" },
  },
  tenantConfig: { id: "optimism", name: "Optimism" },
};

const host = (ctx: unknown) => ({ whitelabel: Promise.resolve(ctx) }) as never;

describe("Tenant chrome", () => {
  it("uses the global navbar and footer on the main domain", async () => {
    render(await TenantNavbar(host(MAIN_DOMAIN)));
    render(await TenantFooter(host(MAIN_DOMAIN)));

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("swaps the navbar and footer for a whitelabel host", async () => {
    render(await TenantNavbar(host(WHITELABEL)));
    render(await TenantFooter(host(WHITELABEL)));

    expect(screen.getByTestId("whitelabel-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("whitelabel-footer")).toBeInTheDocument();
    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
  });

  // The organization schema describes Karma, not the tenant.
  it("mounts the organization schema on the main domain only", async () => {
    const { container: main } = render(await TenantJsonLd(host(MAIN_DOMAIN)));
    expect(main.querySelector("[data-testid=organization-json-ld]")).toBeInTheDocument();

    const { container: tenant } = render(await TenantJsonLd(host(WHITELABEL)));
    expect(tenant.querySelector("[data-testid=organization-json-ld]")).toBeNull();
  });
});

// These pin the cascade contract the inline html style attribute used to provide.
describe("TenantThemeStyle", () => {
  it("emits nothing on the main domain", async () => {
    const { container } = render(await TenantThemeStyle(host(MAIN_DOMAIN)));

    expect(container.querySelector("style")).toBeNull();
  });

  it("targets :root, so portalled dialogs and toasts keep the tenant colour", async () => {
    const { container } = render(await TenantThemeStyle(host(WHITELABEL)));

    const css = container.querySelector("style")?.textContent ?? "";
    expect(css.startsWith(":root{")).toBe(true);
    expect(css).toContain("--primary:");
    expect(css).toContain("--primary-foreground:");
  });

  /**
   * The rule above beats the dark-mode `--primary` on document order at equal
   * specificity, so it only holds while every `--primary` in globals.css is
   * (0,1,0). Tailwind flattens `@layer base` at build time, so layers do not
   * save it — a single `html.dark { --primary: ... }` would take the tenant's
   * colour back in dark mode, silently.
   */
  it("stays winnable: globals.css declares --primary only at :root and .dark", () => {
    const css = readFileSync(
      path.resolve(__dirname, "..", "..", "styles", "globals.css"),
      "utf8"
    );

    // `{` counts as a delimiter too: the :root block opens inside `@layer base{`.
    const selectors = [...css.matchAll(/(^|[{}])\s*([^{}]+?)\s*\{[^{}]*--primary\s*:/g)].map((m) =>
      m[2].trim().split(/\s+/).pop()
    );

    expect(selectors.length).toBeGreaterThan(0);
    expect([...new Set(selectors)].sort()).toEqual([".dark", ":root"]);
  });

  it("drops a colour that is not an HSL token instead of writing it into CSS", async () => {
    const { container } = render(
      await TenantThemeStyle(
        host({
          ...WHITELABEL,
          config: {
            ...WHITELABEL.config,
            // What an operator could put in NEXT_PUBLIC_EXTRA_WHITELABEL_DOMAINS.
            theme: { primaryColor: "red}body{display:none}.x{", buttonTextColor: "#FFFFFF" },
          },
        })
      )
    );

    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).not.toContain("display:none");
    expect(css).not.toContain("--primary:");
    expect(css).toContain("--primary-foreground:");
  });
});
