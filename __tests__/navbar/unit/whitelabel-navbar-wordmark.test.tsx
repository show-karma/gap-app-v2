/**
 * Unit Tests: WhitelabelNavbar brand wordmark
 * Verifies that a tenant configuring navigation.header.wordmark gets a text
 * wordmark linking to the configured external home, while tenants without one
 * keep the logo + title brand linking to the app root.
 */

import { screen } from "@testing-library/react";
import { WhitelabelNavbar } from "@/src/components/navbar/whitelabel-navbar";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  cleanupAfterEach,
  createMockPermissions,
  createMockUsePrivy,
  createMockUseTheme,
  renderWithProviders,
} from "../utils/test-helpers";

// Mutable tenant ref so each test can supply its own navigation config.
const _tenantRef = vi.hoisted(() => ({ tenant: null as TenantConfig | null }));
// Mutable serving-domain ref so each test can pick which whitelabel domain serves the page.
const _whitelabelRef = vi.hoisted(() => ({ domain: null as string | null }));

vi.mock("@/store/tenant", () => ({
  useTenantSafe: vi.fn(() => _tenantRef.tenant),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: vi.fn(() => ({
    isWhitelabel: true,
    communitySlug: "filecoin",
    config: _whitelabelRef.domain ? { domain: _whitelabelRef.domain } : null,
    tenantConfig: null,
  })),
  WhitelabelProvider: ({ children }: { children: unknown }) => children,
}));

function buildTenant(header: Partial<NonNullable<TenantConfig["navigation"]>["header"]>) {
  return {
    id: "filpgf",
    name: "Fil PGF",
    theme: { primaryColor: "#0090FF", secondaryColor: "#E5F3FF", mode: "light" } as any,
    assets: { logo: "/images/filpgf-logo.png" } as any,
    karmaAssets: {} as any,
    navigation: {
      header: { shouldHaveTitle: true, title: "Filecoin Community", ...header },
      items: [],
      showBrowseApplications: true,
    } as any,
    seo: {} as any,
    chainId: 314,
    claimGrants: {} as any,
  } as TenantConfig;
}

function renderNavbar() {
  const authFixture = getAuthFixture("unauthenticated");
  renderWithProviders(<WhitelabelNavbar />, {
    mockUsePrivy: createMockUsePrivy(authFixture.authState),
    mockPermissions: createMockPermissions(authFixture.permissions),
    mockUseTheme: createMockUseTheme("light"),
  });
}

const FILPGF_WORDMARK = {
  prefix: "fil",
  accent: "pgf",
  suffix: ".io",
  href: "https://filpgf.io",
  domains: ["app.filpgf.io"],
  accentColor: "#1a5fd0",
  ariaLabel: "filpgf.io home",
};

describe("WhitelabelNavbar brand wordmark", () => {
  beforeEach(() => {
    _whitelabelRef.domain = null;
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  it("renders the configured wordmark as an external brand link", () => {
    _tenantRef.tenant = buildTenant({
      wordmark: {
        prefix: "fil",
        accent: "pgf",
        suffix: ".io",
        href: "https://filpgf.io",
        accentColor: "#1a5fd0",
        ariaLabel: "filpgf.io home",
      },
    });

    renderNavbar();

    const brand = screen.getByRole("link", { name: "filpgf.io home" });
    expect(brand).toHaveAttribute("href", "https://filpgf.io");
    expect(brand).toHaveTextContent("filpgf.io");

    const accent = screen.getByText("pgf");
    expect(accent).toHaveStyle({ color: "#1a5fd0" });

    // The logo/title brand block is replaced by the wordmark.
    expect(screen.queryByText("Filecoin Community")).not.toBeInTheDocument();
  });

  it("falls back to the logo + title brand linking to the app root when no wordmark is configured", () => {
    _tenantRef.tenant = buildTenant({});

    renderNavbar();

    expect(screen.getByText("Filecoin Community")).toBeInTheDocument();
    const brand = screen.getByRole("link", { name: /Filecoin Community/i });
    expect(brand).toHaveAttribute("href", "/");
    expect(screen.queryByText("pgf")).not.toBeInTheDocument();
  });

  it("renders the wordmark on a domain listed in the wordmark config", () => {
    _tenantRef.tenant = buildTenant({ wordmark: FILPGF_WORDMARK });
    _whitelabelRef.domain = "app.filpgf.io";

    renderNavbar();

    expect(screen.getByRole("link", { name: "filpgf.io home" })).toHaveAttribute(
      "href",
      "https://filpgf.io"
    );
  });

  it("keeps the logo + title brand on another production domain sharing the tenant", () => {
    _tenantRef.tenant = buildTenant({ wordmark: FILPGF_WORDMARK });
    _whitelabelRef.domain = "grants.filecoin.io";

    renderNavbar();

    expect(screen.queryByRole("link", { name: "filpgf.io home" })).not.toBeInTheDocument();
    expect(screen.getByText("Filecoin Community")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Filecoin Community/i })).toHaveAttribute("href", "/");
  });

  it("renders the wordmark on non-production hosts so it stays reviewable on previews", () => {
    _tenantRef.tenant = buildTenant({ wordmark: FILPGF_WORDMARK });
    _whitelabelRef.domain = "filpgf-preview.vercel.app";

    renderNavbar();

    expect(screen.getByRole("link", { name: "filpgf.io home" })).toBeInTheDocument();
  });
});
