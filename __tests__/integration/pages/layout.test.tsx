import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
import "@testing-library/jest-dom/vitest";

<<<<<<< HEAD
jest.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: () => <div data-testid="google-analytics" />,
}));

jest.mock("@/src/components/footer/footer", () => ({
  __esModule: true,
  Footer: () => <footer data-testid="footer" />,
}));

jest.mock("@/src/components/footer/whitelabel-footer", () => ({
  __esModule: true,
  WhitelabelFooter: () => <footer data-testid="whitelabel-footer" />,
}));

// Mock next/dynamic to render components synchronously in tests
jest.mock("next/dynamic", () => {
  return (loader: () => Promise<any>, _opts?: any) => {
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
  };
});

jest.mock("@/src/components/navbar/navbar", () => ({
  Navbar: () => <header data-testid="header" />,
}));

jest.mock("@/src/components/navbar/whitelabel-navbar", () => ({
  WhitelabelNavbar: () => <header data-testid="whitelabel-navbar" />,
=======
vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="analytics" />,
}));

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: () => <div data-testid="google-analytics" />,
}));

vi.mock("@/src/components/footer/footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock("@/src/components/navbar/navbar", () => ({
  Navbar: () => <header data-testid="header" />,
}));

vi.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)
}));

vi.mock("@/components/Utilities/PrivyProviderWrapper", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="privy-provider">{children}</div>
  ),
}));

<<<<<<< HEAD
jest.mock("@/components/Utilities/PermissionsProvider", () => ({
  PermissionsProvider: () => <div data-testid="permissions-provider" />,
}));

jest.mock("next-themes", () => ({
=======
vi.mock("@/components/Dialogs/ContributorProfileDialog", () => ({
  ContributorProfileDialog: () => <div data-testid="contributor-profile-dialog" />,
}));

vi.mock("@/components/Dialogs/OnboardingDialog", () => ({
  OnboardingDialog: () => <div data-testid="onboarding-dialog" />,
}));

vi.mock("@/components/Utilities/PermissionsProvider", () => ({
  PermissionsProvider: () => <div data-testid="permissions-provider" />,
}));

vi.mock("@/components/ProgressBarWrapper", () => ({
  ProgressBarWrapper: () => <div data-testid="progress-bar-wrapper" />,
}));

vi.mock("@/components/Utilities/HotjarAnalytics", () => ({
  __esModule: true,
  default: () => <div data-testid="hotjar-analytics" />,
}));

vi.mock("next-themes", () => ({
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

<<<<<<< HEAD
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
=======
vi.mock("@/components/AgentChat/AgentChatBubble", () => ({
  AgentChatBubble: () => <div data-testid="agent-chat-bubble" />,
}));

vi.mock("@/src/features/api-keys/components/api-key-management-modal", () => ({
  ApiKeyManagementModal: () => <div data-testid="api-key-management-modal" />,
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)
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
