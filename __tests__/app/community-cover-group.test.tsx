/**
 * Executable definition of a "cover page".
 *
 * `app/community/[communityId]/(cover)/` is a sibling route group to
 * `(with-header)/`. Same URLs, deliberately different chrome: financials and
 * portfolio reports are standalone documents that own their own hero, so the
 * group renders NO CommunityHeader and NO CommunityPageNavigator, and it
 * contributes no <h1> of its own — the page underneath owns the only one.
 *
 * Everything the sibling group supplied that is not chrome had to be
 * re-supplied when these routes moved: the `pagesOnRoot` opt-out, the
 * not-found state, the <main> landmark (pinned in
 * accessibility/landmarks-and-labels.test.ts) and the page gutter. The guards
 * are the parts most easily lost in a route-group move, so they are pinned
 * here too.
 *
 * The chrome sentinels are asserted against the `(with-header)` layout first,
 * so "not in the document" cannot pass vacuously.
 */
import "@testing-library/jest-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerElement } from "@/__tests__/helpers/resolveServerElement";

const { getCommunityDetailsMock, usePublishedReportsMock } = vi.hoisted(() => ({
  getCommunityDetailsMock: vi.fn(),
  usePublishedReportsMock: vi.fn(),
}));

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const COMMUNITY = {
  uid: "0xfilecoin",
  details: { name: "Filecoin", slug: "filecoin" },
};

// ─── Route-level dependencies ────────────────────────────────────────────────

vi.mock("@/utilities/pagesOnRoot", () => ({ pagesOnRoot: ["funders"] }));

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: getCommunityDetailsMock,
}));

vi.mock("@/utilities/queries/v2/community", () => ({
  getCommunityDetails: getCommunityDetailsMock,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "filecoin" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/community/filecoin/financials",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt?: string }) => <img alt={alt ?? ""} {...props} />,
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children?: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Chrome sentinels ────────────────────────────────────────────────────────
// The header owns an <h1> in production, so a cover page that accidentally
// mounted it would fail the single-<h1> assertions below as well.

vi.mock("@/components/Pages/Communities/CommunityPageNavigator", () => ({
  CommunityPageNavigator: () => <nav data-testid="community-page-navigator" />,
}));

// Mirrors the real header, which is the only thing that mounts the navigator
// (grep: components/Community/Header.tsx). Composing the mocked navigator here
// rather than inlining a second sentinel is what makes the positive control
// below exercise both sentinels.
vi.mock("@/components/Community/Header", async () => {
  const { CommunityPageNavigator } = await import(
    "@/components/Pages/Communities/CommunityPageNavigator"
  );
  return {
    default: () => (
      <div data-testid="community-header">
        <h1>Community header heading</h1>
        <CommunityPageNavigator />
      </div>
    ),
  };
});

vi.mock("@/components/Community/CommunityContentWrapper", () => ({
  CommunityContentWrapper: ({ children }: { children: ReactNode }) => (
    <div data-testid="community-content-wrapper">{children}</div>
  ),
}));

// ─── Financials page dependencies ────────────────────────────────────────────

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue(null),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("@/src/features/payout-disbursement/services/payout-disbursement.service", () => ({
  getCommunityPayoutsPublic: vi.fn().mockResolvedValue({ payload: [], pagination: {} }),
}));

vi.mock("@/src/features/payout-disbursement/hooks/use-payout-disbursement", () => ({
  useCommunityPayoutsPublic: () => ({
    data: { payload: [], pagination: { totalCount: 0 } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePayoutConfigsByCommunityPublic: () => ({ data: [] }),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycConfig: () => ({ data: null, isLoading: false }),
  useKycBatchStatusesPublic: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/hooks/communities/useCommunityDetails", () => ({
  useCommunityDetails: () => ({ data: COMMUNITY, isLoading: false, error: null }),
}));

vi.mock("@/components/Pages/Admin/ControlCenter/ControlCenterTable", () => ({
  ControlCenterTable: () => <div data-testid="control-center-table" />,
}));

vi.mock("@/components/Pages/Admin/ControlCenter/FilterToolbar", () => ({
  FilterToolbar: () => <div data-testid="filter-toolbar" />,
}));

vi.mock("@/components/Pages/Communities/Financials/PublicProjectDetailsModal", () => ({
  PublicProjectDetailsModal: () => null,
}));

// ─── Reports page dependencies ───────────────────────────────────────────────

vi.mock("@/hooks/portfolio-reports/usePortfolioReports", () => ({
  usePublishedReports: (...args: unknown[]) => usePublishedReportsMock(...args),
}));

vi.mock("nuqs", () => ({
  useQueryState: (_key: string, options?: { defaultValue?: string }) =>
    [options?.defaultValue ?? null, vi.fn()] as const,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ServerComponent = (props: never) => Promise<ReactNode>;

const renderWithClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

async function coverLayout(children: ReactNode, communityId = "filecoin") {
  const { default: CoverLayout } = await import("@/app/community/[communityId]/(cover)/layout");
  return (CoverLayout as unknown as ServerComponent)({
    children,
    params: Promise.resolve({ communityId }),
  } as never);
}

async function withHeaderLayout(children: ReactNode, communityId = "filecoin") {
  const { default: WithHeaderLayout } = await import(
    "@/app/community/[communityId]/(with-header)/layout"
  );
  return (WithHeaderLayout as unknown as ServerComponent)({
    children,
    params: Promise.resolve({ communityId }),
  } as never);
}

// A cover page is either an async component that awaits params at the top or a
// sync one returning <Suspense><Body params={...}/></Suspense>. resolveServerElement
// normalises both so these assertions read the same for either shape — without
// it the streaming shape renders only its loading.tsx fallback here.
async function coverPage(
  importer: () => Promise<{ default: unknown }>,
  params: Record<string, string>
) {
  const { default: Page } = await importer();
  return resolveServerElement(
    await (Page as unknown as ServerComponent)({ params: Promise.resolve(params) } as never)
  );
}

const h1s = () => screen.queryAllByRole("heading", { level: 1 });

const PUBLISHED_REPORT = {
  id: "report-1",
  runDate: "2026-04-01",
  reportConfigId: "config-1",
  reportConfigName: "Monthly Pods Report",
  reportConfigSlug: "monthly-pods",
  title: "April pods report",
  content: "<p>Progress</p>",
  publishedAt: "2026-04-02T00:00:00.000Z",
  status: "published",
};

beforeEach(() => {
  vi.clearAllMocks();
  getCommunityDetailsMock.mockResolvedValue(COMMUNITY);
  usePublishedReportsMock.mockReturnValue({
    data: [PUBLISHED_REPORT],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("(cover) layout renders no explorer chrome", () => {
  // Positive control: the sentinels do render when a layout mounts the chrome,
  // so the absence assertions below are meaningful.
  it("the (with-header) sibling still mounts the header and its navigator", async () => {
    renderWithClient(await withHeaderLayout(<p>child</p>));

    expect(screen.getByTestId("community-header")).toBeInTheDocument();
    expect(screen.getByTestId("community-page-navigator")).toBeInTheDocument();
  });

  it("mounts neither the community header nor the tab navigator", async () => {
    renderWithClient(await coverLayout(<p>child</p>));

    expect(screen.queryByTestId("community-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("community-page-navigator")).not.toBeInTheDocument();
  });

  // Second layer: the render above can only catch chrome that is mounted for
  // this community. A source-level scan catches it however it is conditioned.
  it("names none of the explorer chrome components in its code", () => {
    // Comments are stripped: the layout's own doc comment explains which chrome
    // it deliberately omits, and naming them there must stay allowed.
    const source = readFileSync(
      path.join(REPO_ROOT, "app/community/[communityId]/(cover)/layout.tsx"),
      "utf8"
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    for (const chrome of ["CommunityHeader", "HeaderStatsCards", "CommunityPageNavigator"]) {
      expect(source, `(cover)/layout.tsx must not render ${chrome}`).not.toContain(chrome);
    }
  });

  it("contributes no <h1> of its own, so the page owns the only one", async () => {
    renderWithClient(await coverLayout(<h1>Page hero</h1>));

    expect(h1s()).toHaveLength(1);
    expect(h1s()[0]).toHaveTextContent("Page hero");
  });

  it("still renders the community name as a way back to the explorer", async () => {
    renderWithClient(await coverLayout(<p>child</p>));

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb).toHaveTextContent("Filecoin");
    expect(breadcrumb.querySelector("a")).toHaveAttribute("href", "/community/filecoin");
  });
});

describe("cover pages own exactly one <h1>", () => {
  it("financials renders a single hero heading under the cover layout", async () => {
    const page = await coverPage(
      () => import("@/app/community/[communityId]/(cover)/financials/page"),
      { communityId: "filecoin" }
    );
    renderWithClient(await coverLayout(page));

    expect(h1s()).toHaveLength(1);
    expect(h1s()[0]).toHaveTextContent("Commitments & Disbursements");
  });

  it("reports renders a single hero heading under the cover layout", async () => {
    const page = await coverPage(
      () => import("@/app/community/[communityId]/(cover)/reports/page"),
      { communityId: "filecoin" }
    );
    renderWithClient(await coverLayout(page));

    expect(h1s()).toHaveLength(1);
    expect(h1s()[0]).toHaveTextContent("Portfolio Reports");
  });

  it("reports keeps a single hero heading in its empty state", async () => {
    usePublishedReportsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const page = await coverPage(
      () => import("@/app/community/[communityId]/(cover)/reports/page"),
      { communityId: "filecoin" }
    );
    renderWithClient(await coverLayout(page));

    expect(h1s()).toHaveLength(1);
    expect(h1s()[0]).toHaveTextContent("Portfolio Reports");
  });

  it("an unflagged community's financials fallback is still a single <h1>", async () => {
    const page = await coverPage(
      () => import("@/app/community/[communityId]/(cover)/financials/page"),
      { communityId: "celo" }
    );
    renderWithClient(await coverLayout(page, "celo"));

    expect(h1s()).toHaveLength(1);
    expect(h1s()[0]).toHaveTextContent("Commitments & Disbursements not available");
  });
});

describe("(cover) layout keeps the guards the route-group move could have dropped", () => {
  it("renders CommunityNotFound for an unknown community", async () => {
    getCommunityDetailsMock.mockResolvedValue(null);

    renderWithClient(await coverLayout(<h1>Page hero</h1>, "does-not-exist"));

    expect(screen.getByText("Community not found")).toBeInTheDocument();
    // The page must not render behind the not-found state.
    expect(screen.queryByText("Page hero")).not.toBeInTheDocument();
  });

  it("opts out entirely for slugs that are root pages, not communities", async () => {
    expect(await coverLayout(<p>child</p>, "funders")).toBeUndefined();
    expect(getCommunityDetailsMock).not.toHaveBeenCalled();
  });
});
