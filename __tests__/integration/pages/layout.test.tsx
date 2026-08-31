import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
import { TenantChrome } from "@/src/components/layout/tenant-chrome";
import "@testing-library/jest-dom";

// next/font/local and next/font/google are mocked globally in
// __tests__/setup-mocks.ts (they are Next compiler features, unavailable in
// jsdom). app/layout.tsx imports both, so no file-local font mock is needed.

const { getWhitelabelContextMock } = vi.hoisted(() => ({
  getWhitelabelContextMock: vi.fn(),
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
  getWhitelabelContext: getWhitelabelContextMock,
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

beforeEach(() => {
  vi.clearAllMocks();
  getWhitelabelContextMock.mockResolvedValue(MAIN_DOMAIN);
});

describe("RootLayout - the request-independent App Shell", () => {
  // Hold the chrome below the boundary for this whole block: the shell's
  // contract is what it can paint *before* the host is known, and a context
  // that never settles is that state, with no post-test update to warn about.
  beforeEach(() => {
    getWhitelabelContextMock.mockReturnValue(new Promise(() => {}));
  });

  // The whole point of the refactor: a root layout that awaits request data
  // blocks the prerendered shell for every route under cacheComponents. The
  // host read still happens — one Suspense boundary down, where it streams
  // instead of blocking — so what has to hold here is that the shell itself
  // never waits for it.
  it("returns its tree synchronously rather than awaiting the request", () => {
    const tree = RootLayout({ children: <>Test Content</> });

    expect(tree).not.toBeInstanceOf(Promise);
    expect(getWhitelabelContextMock).not.toHaveBeenCalled();
  });

  it("renders the document scaffold and the theme provider", () => {
    render(RootLayout({ children: <>Test Content</> }));

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider").closest("body")).toBeInTheDocument();
  });

  it("reserves the navbar height while the chrome streams, so it does not shift", () => {
    const { container } = render(RootLayout({ children: <>Test Content</> }));

    // The Suspense fallback, since TenantChrome has not resolved.
    expect(container.querySelector("[data-app-content]")).toBeInTheDocument();
    expect(container.querySelector("[data-app-chrome]")).toBeInTheDocument();
  });
});

describe("TenantChrome - the host-dependent chrome", () => {
  it("renders critical components eagerly", async () => {
    render(await TenantChrome({ children: <>Test Content</> }));

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("privy-provider")).toBeInTheDocument();
    expect(screen.getByTestId("permissions-provider")).toBeInTheDocument();
    expect(screen.getByTestId("whitelabel-provider")).toBeInTheDocument();
    expect(screen.getByTestId("organization-json-ld")).toBeInTheDocument();
  });

  it("renders DeferredLayoutComponents", async () => {
    render(await TenantChrome({ children: <>Test Content</> }));

    expect(screen.getByTestId("deferred-layout-components")).toBeInTheDocument();
  });

  it("renders children content", async () => {
    render(await TenantChrome({ children: <>Test Content</> }));

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("emits no tenant stylesheet on the main domain", async () => {
    const { container } = render(await TenantChrome({ children: <>Test Content</> }));

    expect(container.querySelector("style")).toBeNull();
  });

  it("swaps the navbar and footer for a whitelabel host", async () => {
    getWhitelabelContextMock.mockResolvedValue(WHITELABEL);

    render(await TenantChrome({ children: <>Test Content</> }));

    expect(screen.getByTestId("whitelabel-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("whitelabel-footer")).toBeInTheDocument();
    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
    // The organization schema describes Karma, not the tenant.
    expect(screen.queryByTestId("organization-json-ld")).not.toBeInTheDocument();
  });
});

// These pin the cascade contract the inline html style attribute used to provide.
describe("TenantChrome tenant theme", () => {
  it("targets :root, so portalled dialogs and toasts keep the tenant colour", async () => {
    getWhitelabelContextMock.mockResolvedValue(WHITELABEL);

    const { container } = render(await TenantChrome({ children: <>Test Content</> }));

    const css = container.querySelector("style")?.textContent ?? "";
    expect(css.startsWith(":root{")).toBe(true);
    expect(css).toContain("--primary:");
    expect(css).toContain("--primary-foreground:");
  });

  it("drops a colour that is not an HSL token instead of writing it into CSS", async () => {
    getWhitelabelContextMock.mockResolvedValue({
      ...WHITELABEL,
      config: {
        ...WHITELABEL.config,
        // What an operator could put in NEXT_PUBLIC_EXTRA_WHITELABEL_DOMAINS.
        theme: { primaryColor: "red}body{display:none}.x{", buttonTextColor: "#FFFFFF" },
      },
    });

    const { container } = render(await TenantChrome({ children: <>Test Content</> }));

    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).not.toContain("display:none");
    expect(css).not.toContain("--primary:");
    expect(css).toContain("--primary-foreground:");
  });
});
