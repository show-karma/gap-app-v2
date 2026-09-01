import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
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

vi.mock("@/src/components/layout/tenant-store-sync", () => ({
  TenantStoreSync: () => <div data-testid="tenant-store-sync" />,
}));

// The chrome are async server components and the provider unwraps a promise —
// neither is renderable by the client renderer the way SSR renders them. Both
// contracts are pinned directly: __tests__/app/tenant-chrome.test.tsx and
// __tests__/utilities/whitelabel-context.test.tsx. Stubbed here so these tests
// can assert the one thing only the layout owns — its shape.
vi.mock("@/src/components/layout/tenant-chrome", () => ({
  TenantThemeStyle: () => <div data-testid="tenant-theme-style" />,
  TenantNavbar: () => <header data-testid="tenant-navbar" />,
  TenantFooter: () => <footer data-testid="tenant-footer" />,
  TenantJsonLd: () => <div data-testid="tenant-json-ld" />,
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  WhitelabelProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="whitelabel-provider">{children}</div>
  ),
  useWhitelabel: () => ({
    isWhitelabel: false,
    communitySlug: null,
    config: null,
    tenantConfig: null,
  }),
}));

vi.mock("@/components/DeferredLayoutComponents", () => ({
  DeferredLayoutComponents: () => <div data-testid="deferred-layout-components" />,
}));

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: getWhitelabelContextMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  getWhitelabelContextMock.mockResolvedValue({
    isWhitelabel: false,
    communitySlug: null,
    config: null,
    tenantConfig: null,
  });
});

describe("RootLayout - the request-independent App Shell", () => {
  // The whole point of the refactor: a root layout that awaits request data
  // blocks the prerendered shell for every route under cacheComponents. It
  // still *starts* the read — it just never waits for it.
  it("returns its tree synchronously rather than awaiting the request", () => {
    const tree = RootLayout({ children: <>Test Content</> });

    expect(tree).not.toBeInstanceOf(Promise);
  });

  it("starts the whitelabel read exactly once and passes it down", () => {
    render(RootLayout({ children: <>Test Content</> }));

    expect(getWhitelabelContextMock).toHaveBeenCalledTimes(1);
  });

  it("renders the document scaffold and the theme provider", () => {
    render(RootLayout({ children: <>Test Content</> }));

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider").closest("body")).toBeInTheDocument();
  });

  // DEV-612: a boundary above the page makes Next stream it as a hidden late
  // chunk that only JavaScript reveals, so sitemap-crawlable routes lose their
  // content for no-JS readers. Nothing in this layout may introduce one.
  it("renders children in the primary tree, with no Suspense boundary above them", () => {
    const tree = RootLayout({ children: <>Test Content</> });
    render(tree);

    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(JSON.stringify(tree, replaceSuspense)).not.toContain("__SUSPENSE__");
  });

  it("keeps the providers and the deferred chrome around the page", () => {
    render(RootLayout({ children: <>Test Content</> }));

    expect(screen.getByTestId("privy-provider")).toBeInTheDocument();
    expect(screen.getByTestId("whitelabel-provider")).toBeInTheDocument();
    expect(screen.getByTestId("permissions-provider")).toBeInTheDocument();
    expect(screen.getByTestId("deferred-layout-components")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-store-sync")).toBeInTheDocument();
  });

  it("mounts the host-dependent chrome around the page", () => {
    const { container } = render(RootLayout({ children: <>Test Content</> }));

    expect(screen.getByTestId("tenant-theme-style")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-footer")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-json-ld")).toBeInTheDocument();
    expect(container.querySelector("[data-app-content]")).toBeInTheDocument();
  });
});

/** Marks any Suspense element so the assertion above can spot one. */
function replaceSuspense(_key: string, value: unknown) {
  if (typeof value === "symbol") {
    return value.description === "react.suspense" ? "__SUSPENSE__" : value.description;
  }
  return value;
}
