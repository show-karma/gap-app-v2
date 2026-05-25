/**
 * Unit Tests: WhitelabelNavbar social link labels
 * Verifies that a tenant can override the default "Twitter" social link label
 * via navigation.socialLinkLabels (e.g. Filecoin shows "Social"), while tenants
 * without an override keep the default label.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
// NOTE: the social links are asserted via the mobile menu (plain conditional render).
// The desktop "Resources" dropdown is a Radix DropdownMenu using setPointerCapture,
// which does not open under jsdom, so it can't be exercised in unit tests here.
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

vi.mock("@/store/tenant", () => ({
  useTenantSafe: vi.fn(() => _tenantRef.tenant),
}));

function buildTenant(navigation: Partial<TenantConfig["navigation"]>): TenantConfig {
  return {
    id: "filpgf",
    name: "Fil PGF",
    theme: { primaryColor: "#0090FF", secondaryColor: "#E5F3FF", mode: "light" } as any,
    assets: { logo: "/images/filpgf-logo.png" } as any,
    karmaAssets: {} as any,
    navigation: {
      header: { shouldHaveTitle: true, title: "Fil PGF" },
      items: [],
      showBrowseApplications: true,
      ...navigation,
    } as any,
    seo: {} as any,
    chainId: 314,
    claimGrants: {} as any,
  };
}

function renderNavbar() {
  const authFixture = getAuthFixture("unauthenticated");
  renderWithProviders(<WhitelabelNavbar />, {
    mockUsePrivy: createMockUsePrivy(authFixture.authState),
    mockPermissions: createMockPermissions(authFixture.permissions),
    mockUseTheme: createMockUseTheme("light"),
  });
}

describe("WhitelabelNavbar social link labels", () => {
  afterEach(() => {
    cleanupAfterEach();
  });

  it('renders the overridden label ("Social") when socialLinkLabels.twitter is set', async () => {
    _tenantRef.tenant = buildTenant({
      socialLinks: { twitter: "https://x.com/Filecoin" },
      socialLinkLabels: { twitter: "Social" },
    });

    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Social" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: "Twitter" })).not.toBeInTheDocument();
  });

  it('falls back to the default "Twitter" label when no override is provided', async () => {
    _tenantRef.tenant = buildTenant({
      socialLinks: { twitter: "https://x.com/optimism" },
    });

    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Twitter" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: "Social" })).not.toBeInTheDocument();
  });
});
