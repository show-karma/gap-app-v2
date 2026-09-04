import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { tenant } from "next/root-params";
import RootLayout, { generateStaticParams } from "@/app/t/[tenant]/layout";
import { isKnownTenantParam } from "@/utilities/tenant-param";
import { WHITELABEL_DOMAINS } from "@/utilities/whitelabel-config";
import "@testing-library/jest-dom";

// next/font/local and next/font/google are mocked globally in
// __tests__/setup-mocks.ts (they are Next compiler features, unavailable in
// jsdom). app/layout.tsx imports both, so no file-local font mock is needed.

const { getWhitelabelContextMock } = vi.hoisted(() => ({
  getWhitelabelContextMock: vi.fn(),
}));

// The layout reads the `[tenant]` root param instead of the request host. The
// global mock in __tests__/setup-mocks.ts resolves it to the main tenant; the
// unknown-value case overrides it per test.
vi.mock("next/root-params", () => ({
  tenant: vi.fn(async () => "karma"),
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
  vi.mocked(tenant).mockResolvedValue("karma");
  getWhitelabelContextMock.mockResolvedValue({
    isWhitelabel: false,
    communitySlug: null,
    config: null,
    tenantConfig: null,
  });
});

describe("RootLayout - the request-independent App Shell", () => {
  // The whole point of the refactor: a root layout that awaits request data
  // blocks the prerendered shell for every route under cacheComponents. The
  // only thing it awaits now is the `[tenant]` root param, which comes from the
  // matched route — the value the prerender is keyed on, not request state.
  it("renders without waiting for the whitelabel read to resolve", async () => {
    getWhitelabelContextMock.mockReturnValue(new Promise(() => {}));

    render(await RootLayout({ children: <>Test Content</> }));

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("starts the whitelabel read exactly once and passes it down", async () => {
    render(await RootLayout({ children: <>Test Content</> }));

    expect(getWhitelabelContextMock).toHaveBeenCalledTimes(1);
  });

  // The `/t/<tenant>` prefix is written by the proxy and never seen by a
  // browser, so a value the proxy would not have produced is a hand-crafted
  // URL, not a tenant.
  it("404s on a tenant param this deployment does not serve", async () => {
    vi.mocked(tenant).mockResolvedValue("not-a-tenant.example");

    await RootLayout({ children: <>Test Content</> });

    expect(notFound).toHaveBeenCalled();
  });

  it("serves the main tenant without calling notFound", async () => {
    await RootLayout({ children: <>Test Content</> });

    expect(notFound).not.toHaveBeenCalled();
  });

  // cacheComponents fails the build unless every root param has at least one
  // value, and each listed value gets its own prerendered shell.
  //
  // D3: only karma is prerendered. Listing every tenant multiplied the build by
  // the tenant count — 8 full copies of ~185 routes — for shells that differ
  // only by theme. Tenant shells render on demand and persist after the first
  // request, so the cost is one cold render per tenant per deploy.
  it("prerenders only the karma shell", () => {
    const params = generateStaticParams();

    expect(params).toEqual([{ tenant: "karma" }]);
  });

  // The narrower prerender list must not narrow what is servable: every
  // whitelabel domain still has to pass validation and render on demand.
  it("still accepts every whitelabel tenant at request time", () => {
    for (const config of WHITELABEL_DOMAINS) {
      expect(isKnownTenantParam(config.domain)).toBe(true);
    }
    expect(isKnownTenantParam("karma")).toBe(true);
    expect(isKnownTenantParam("not-a-tenant")).toBe(false);
  });

  it("renders the document scaffold and the theme provider", async () => {
    render(await RootLayout({ children: <>Test Content</> }));

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider").closest("body")).toBeInTheDocument();
  });

  // DEV-612: a boundary above the page makes Next stream it as a hidden late
  // chunk that only JavaScript reveals, so sitemap-crawlable routes lose their
  // content for no-JS readers. Nothing in this layout may introduce one.
  it("renders children in the primary tree, with no Suspense boundary above them", async () => {
    const tree = await RootLayout({ children: <>Test Content</> });
    render(tree);

    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(JSON.stringify(tree, replaceSuspense)).not.toContain("__SUSPENSE__");
  });

  it("keeps the providers and the deferred chrome around the page", async () => {
    render(await RootLayout({ children: <>Test Content</> }));

    expect(screen.getByTestId("privy-provider")).toBeInTheDocument();
    expect(screen.getByTestId("whitelabel-provider")).toBeInTheDocument();
    expect(screen.getByTestId("permissions-provider")).toBeInTheDocument();
    expect(screen.getByTestId("deferred-layout-components")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-store-sync")).toBeInTheDocument();
  });

  it("mounts the tenant-dependent chrome that is not navbar or footer", async () => {
    const { container } = render(await RootLayout({ children: <>Test Content</> }));

    expect(screen.getByTestId("tenant-theme-style")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-json-ld")).toBeInTheDocument();
    expect(container.querySelector("[data-app-content]")).toBeInTheDocument();
  });

  // Which routes get chrome is answered by the route tree — the `(chrome)` and
  // `(bare)` groups — not by a `usePathname()` test in a client component. The
  // root layout must therefore render neither, or the `(bare)` sections would
  // get the app navbar on top of their own.
  it("renders no navbar and no footer of its own", async () => {
    render(await RootLayout({ children: <>Test Content</> }));

    expect(screen.queryByTestId("tenant-navbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tenant-footer")).not.toBeInTheDocument();
  });
});

/** Marks any Suspense element so the assertion above can spot one. */
function replaceSuspense(_key: string, value: unknown) {
  if (typeof value === "symbol") {
    return value.description === "react.suspense" ? "__SUSPENSE__" : value.description;
  }
  return value;
}
