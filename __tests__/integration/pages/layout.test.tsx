import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
import "@testing-library/jest-dom";

jest.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: () => <div data-testid="google-analytics" />,
}));

jest.mock("@/src/components/footer/footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

jest.mock("@/src/components/footer/whitelabel-footer", () => ({
  WhitelabelFooter: () => <footer data-testid="whitelabel-footer" />,
}));

jest.mock("@/src/components/navbar/navbar", () => ({
  Navbar: () => <header data-testid="header" />,
}));

jest.mock("@/src/components/navbar/whitelabel-navbar", () => ({
  WhitelabelNavbar: () => <header data-testid="whitelabel-navbar" />,
}));

jest.mock("@/components/Utilities/PrivyProviderWrapper", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="privy-provider">{children}</div>
  ),
}));

jest.mock("@/components/Utilities/PermissionsProvider", () => ({
  PermissionsProvider: () => <div data-testid="permissions-provider" />,
}));

jest.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock("@/utilities/whitelabel-context", () => ({
  WhitelabelProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="whitelabel-provider">{children}</div>
  ),
}));

jest.mock("@/components/Utilities/TenantStoreInitializer", () => ({
  TenantStoreInitializer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tenant-store-initializer">{children}</div>
  ),
}));

jest.mock("@/components/Seo/OrganizationJsonLd", () => ({
  OrganizationJsonLd: () => <div data-testid="organization-json-ld" />,
}));

jest.mock("@/components/DeferredLayoutComponents", () => ({
  DeferredLayoutComponents: (props: { isWhitelabel: boolean }) => (
    <div data-testid="deferred-layout-components" data-whitelabel={props.isWhitelabel} />
  ),
}));

jest.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: jest.fn().mockResolvedValue({
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

  it("renders DeferredLayoutComponents with correct props", async () => {
    const jsx = await RootLayout({ children: <>Test Content</> });
    render(jsx);

    const deferred = screen.getByTestId("deferred-layout-components");
    expect(deferred).toBeInTheDocument();
    expect(deferred).toHaveAttribute("data-whitelabel", "false");
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
