/**
 * Unit Tests: WhitelabelNavbar Theme Toggle
 * Verifies that the WhitelabelNavbar includes a theme toggle button,
 * matching the behavior of the main Navbar.
 */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Mock useTenantSafe to return a tenant config
const mockTenant: TenantConfig = {
  id: "filpgf",
  name: "Fil PGF",
  theme: {
    primaryColor: "#0090FF",
    secondaryColor: "#E5F3FF",
    mode: "light",
  } as any,
  assets: {
    logo: "/images/filpgf-logo.png",
  } as any,
  karmaAssets: {} as any,
  navigation: {
    header: { shouldHaveTitle: true, title: "Fil PGF" },
    items: [],
    showBrowseApplications: true,
    socialLinks: {},
  } as any,
  seo: {} as any,
  chainId: 314,
  claimGrants: {} as any,
};

vi.mock("@/store/tenant", () => ({
  useTenantSafe: vi.fn(() => mockTenant),
}));

describe("WhitelabelNavbar Theme Toggle", () => {
  afterEach(() => {
    cleanupAfterEach();
  });

  describe("Desktop", () => {
    it("should render a theme toggle button", () => {
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<WhitelabelNavbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme("light"),
      });

      const themeToggles = screen.getAllByLabelText(/toggle theme/i);
      expect(themeToggles.length).toBeGreaterThanOrEqual(1);
    });

    it("should call setTheme when clicked", async () => {
      const user = userEvent.setup();
      const mockSetTheme = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<WhitelabelNavbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      const themeToggles = screen.getAllByLabelText(/toggle theme/i);
      await user.click(themeToggles[0]);

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  describe("Mobile", () => {
    it("should render a theme toggle visible in the mobile header area", () => {
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<WhitelabelNavbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme("light"),
      });

      // There should be at least 2 theme toggles (desktop + mobile header area)
      const themeToggles = screen.getAllByLabelText(/toggle theme/i);
      expect(themeToggles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Unauthenticated", () => {
    it("should render a theme toggle button when not logged in", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<WhitelabelNavbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme("dark"),
      });

      const themeToggles = screen.getAllByLabelText(/toggle theme/i);
      expect(themeToggles.length).toBeGreaterThanOrEqual(1);
    });
  });
});
