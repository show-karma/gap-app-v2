import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
import "@testing-library/jest-dom";

vi.mock("next/font/local", () => ({
  __esModule: true,
  default: () => ({
    className: "mock-font",
    variable: "--mock-font",
    style: { fontFamily: "mock" },
  }),
}));

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

// Mock next/dynamic to render components synchronously in tests
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<any>, _opts?: any) => {
    let Component: any = null;
    const promise = loader();
    promise.then((mod: any) => {
      Component = mod.default || mod;
    });
    // Return a wrapper that renders the resolved component
    const DynamicComponent = (props: any) => {
      if (!Component) return null;
      return <Component {...props} />;
    };
    DynamicComponent.displayName = "DynamicComponent";
    return DynamicComponent;
  },
}));

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
  DeferredLayoutComponents: () => <div data-testid="deferred-layout-components" />,
}));

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn().mockResolvedValue({
    isWhitelabel: false,
    communitySlug: null,
    tenantConfig: null,
  }),
}));

describe("RootLayout", () => {
  it("renders critical components eagerly", async () => {
    const jsx = await RootLayout({ children: <>Test Content</> });
    render(jsx);

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("privy-provider")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("permissions-provider")).toBeInTheDocument();
    expect(screen.getByTestId("whitelabel-provider")).toBeInTheDocument();
    expect(screen.getByTestId("organization-json-ld")).toBeInTheDocument();
  });

  it("renders DeferredLayoutComponents", async () => {
    const jsx = await RootLayout({ children: <>Test Content</> });
    render(jsx);

    expect(screen.getByTestId("deferred-layout-components")).toBeInTheDocument();
  });

  it("renders children content", async () => {
    const jsx = await RootLayout({ children: <>Test Content</> });
    render(jsx);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("has the correct HTML structure", async () => {
    const jsx = await RootLayout({ children: <>Test Content</> });
    render(jsx);

    const body = screen.getByText("Test Content").closest("body");
    expect(body).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
