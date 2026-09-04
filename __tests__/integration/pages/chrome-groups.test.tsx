import { render, screen } from "@testing-library/react";
import BareLayout from "@/app/t/[tenant]/(bare)/layout";
import ChromeLayout from "@/app/t/[tenant]/(chrome)/layout";
import "@testing-library/jest-dom";

/**
 * Whether a route gets the app navbar and footer used to be three
 * `pathname.startsWith(...)` tests inside `GlobalNavbarSlot` and
 * `FooterSwitcher` — client components reading URL state on every route, which
 * is what kept every route out of the prerender (`CLIENT_HOOK_DYNAMIC`). The
 * answer is now the route tree: `(chrome)` has the chrome, `(bare)` does not.
 *
 * These two layouts are the whole mechanism, so they are pinned directly. The
 * membership half — which routes live in which group — is pinned by
 * `__tests__/app/route-file-structure.test.ts`.
 */
vi.mock("@/src/components/layout/tenant-chrome", () => ({
  TenantNavbar: () => <header data-testid="tenant-navbar" />,
  TenantFooter: () => <footer data-testid="tenant-footer" />,
}));

const { getWhitelabelContextMock } = vi.hoisted(() => ({
  getWhitelabelContextMock: vi.fn(),
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

describe("(chrome) group layout", () => {
  it("puts the navbar above the page and the footer below it", () => {
    render(<ChromeLayout>Page</ChromeLayout>);

    expect(screen.getByTestId("tenant-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-footer")).toBeInTheDocument();
    expect(screen.getByText("Page")).toBeInTheDocument();
  });

  // The navbar carries the internal link graph. A boundary over it streams it
  // as a hidden late chunk that only JavaScript reveals, which costs every
  // crawlable route its links (DEV-612).
  it("wraps nothing in a Suspense boundary", () => {
    const tree = <ChromeLayout>Page</ChromeLayout>;

    expect(JSON.stringify(tree, replaceSuspense)).not.toContain("__SUSPENSE__");
  });

  it("does not await the whitelabel read", async () => {
    getWhitelabelContextMock.mockReturnValue(new Promise(() => {}));

    render(<ChromeLayout>Page</ChromeLayout>);

    expect(screen.getByText("Page")).toBeInTheDocument();
  });
});

describe("(bare) group layout", () => {
  it("renders the page column without navbar or footer", () => {
    render(<BareLayout>Page</BareLayout>);

    expect(screen.getByText("Page")).toBeInTheDocument();
    expect(screen.queryByTestId("tenant-navbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tenant-footer")).not.toBeInTheDocument();
  });

  it("never reads the whitelabel context — it has no chrome to switch", () => {
    render(<BareLayout>Page</BareLayout>);

    expect(getWhitelabelContextMock).not.toHaveBeenCalled();
  });
});

/** Marks any Suspense element so the assertion above can spot one. */
function replaceSuspense(_key: string, value: unknown) {
  if (typeof value === "symbol") {
    return value.description === "react.suspense" ? "__SUSPENSE__" : value.description;
  }
  return value;
}
