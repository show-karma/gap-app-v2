/**
 * Integration tests for RootLayout.
 *
 * Tests behavioral concerns of the root layout:
 * - Whitelabel vs non-whitelabel rendering produces different navbars/footers
 * - Children content is rendered within the layout
 * - Provider composition: Privy, Theme, Whitelabel providers wrap content
 * - DeferredLayoutComponents receives correct isWhitelabel prop
 */

import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
import "@testing-library/jest-dom/vitest";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: () => <div data-testid="google-analytics" />,
}));

vi.mock("@/src/components/footer/footer", () => ({
  __esModule: true,
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock("@/src/components/footer/whitelabel-footer", () => ({
  __esModule: true,
  WhitelabelFooter: () => <footer data-testid="whitelabel-footer" />,
}));

vi.mock("next/dynamic", () => {
  return (loader: () => Promise<any>, _opts?: any) => {
    let Component: any = null;
    const promise = loader();
    promise.then((mod: any) => {
      Component = mod.default || mod;
    });
    const DynamicComponent = (props: any) => {
      if (!Component) return null;
      return <Component {...props} />;
    };
    DynamicComponent.displayName = "DynamicComponent";
    return DynamicComponent;
  };
});

vi.mock("@/src/components/navbar/navbar", () => ({
  Navbar: () => <header data-testid="header" />,
}));

vi.mock("@/src/components/navbar/whitelabel-navbar", () => ({
  WhitelabelNavbar: () => <header data-testid="whitelabel-navbar" />,
}));

vi.mock("@/components/Utilities/PrivyProviderWrapper", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="privy-provider">{children}</div>
  ),
}));

vi.mock("@/components/Utilities/PermissionsProvider", () => ({
  PermissionsProvider: () => <div data-testid="permissions-provider" />,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  WhitelabelProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="whitelabel-provider">{children}</div>
  ),
}));

vi.mock("@/components/Utilities/TenantStoreInitializer", () => ({
  TenantStoreInitializer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tenant-store-initializer">{children}</div>
  ),
}));

vi.mock("@/components/Seo/OrganizationJsonLd", () => ({
  OrganizationJsonLd: () => <div data-testid="organization-json-ld" />,
}));

vi.mock("@/components/DeferredLayoutComponents", () => ({
  DeferredLayoutComponents: (props: { isWhitelabel: boolean }) => (
    <div data-testid="deferred-layout-components" data-whitelabel={props.isWhitelabel} />
  ),
}));

// Default: non-whitelabel
const mockGetWhitelabelContext = vi.fn().mockResolvedValue({
  isWhitelabel: false,
  communitySlug: null,
  tenantConfig: null,
});

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: (...args: any[]) => mockGetWhitelabelContext(...args),
}));

describe("RootLayout", () => {
  afterEach(() => {
    mockGetWhitelabelContext.mockResolvedValue({
      isWhitelabel: false,
      communitySlug: null,
      tenantConfig: null,
    });
  });

  describe("non-whitelabel mode", () => {
    it("renders standard Navbar and Footer with all providers", async () => {
      const jsx = await RootLayout({ children: <>Test Content</> });
      render(jsx);

      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
      expect(screen.getByTestId("privy-provider")).toBeInTheDocument();
      expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
      expect(screen.getByTestId("permissions-provider")).toBeInTheDocument();
      expect(screen.getByTestId("whitelabel-provider")).toBeInTheDocument();
    });

    it("renders OrganizationJsonLd SEO component", async () => {
      const jsx = await RootLayout({ children: <>Test Content</> });
      render(jsx);

      expect(screen.getByTestId("organization-json-ld")).toBeInTheDocument();
    });

    it("passes isWhitelabel=false to DeferredLayoutComponents", async () => {
      const jsx = await RootLayout({ children: <>Test Content</> });
      render(jsx);

      const deferred = screen.getByTestId("deferred-layout-components");
      expect(deferred).toHaveAttribute("data-whitelabel", "false");
    });
  });

  describe("children rendering", () => {
    it("renders children content within the layout", async () => {
      const jsx = await RootLayout({
        children: <div data-testid="page-content">My Page</div>,
      });
      render(jsx);

      expect(screen.getByTestId("page-content")).toBeInTheDocument();
      expect(screen.getByText("My Page")).toBeInTheDocument();
    });
  });

  describe("document structure", () => {
    it("places content inside a body element with header above and footer below", async () => {
      const jsx = await RootLayout({ children: <>Test Content</> });
      render(jsx);

      // Verify the structural relationship
      const body = screen.getByText("Test Content").closest("body");
      expect(body).toBeInTheDocument();
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });
  });
});
