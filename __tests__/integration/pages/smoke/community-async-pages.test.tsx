import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { isValidElement, Suspense } from "react";

/**
 * Smoke tests for async server-rendered community pages. Pattern:
 *  1. Mock the data-fetching helpers (getCommunityDetails etc.) so the page
 *     can resolve without the network.
 *  2. Mock the inner page-component import with a sentinel.
 *  3. Invoke the page as `await Page({ params: Promise.resolve({...}) })`.
 *  4. Resolve the server tree (see resolveServerElement) and render() it, then
 *     check the sentinel is mounted.
 *
 * Two page shapes are in play. The classic one is an async Page that awaits
 * params at the top. The Cache Components one is a sync Page returning
 * <Suspense><Body params={props.params}/></Suspense>, where Body is the async
 * component that awaits params. resolveServerElement below normalises both to
 * the rendered tree, so a page's assertions are identical either way — and, for
 * the notFound() tests, the rejection surfaces from whichever component
 * actually performs the validation.
 */

const mockCommunity = {
  uid: "0x123",
  details: { name: "Test Community", slug: "test-community" },
};

vi.mock("@/utilities/queries/v2/community", () => ({
  getCommunityDetails: vi.fn().mockResolvedValue(mockCommunity),
}));

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityDetails: vi.fn().mockResolvedValue(mockCommunity),
  getCommunityProjects: vi.fn().mockResolvedValue({
    data: [],
    pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
  }),
  getCommunityCategories: vi.fn().mockResolvedValue([{ name: "DeFi" }, { name: "NFT" }]),
  getCommunityStats: vi.fn().mockResolvedValue({ totalProjects: 0, totalGrants: 0 }),
}));

vi.mock("@/utilities/pagesOnRoot", () => ({ pagesOnRoot: [] }));

// The /manage/portfolio-reports/config page now calls the unified API client
// directly (issue #1775 Phase 3 migration) and rethrows on failure, so it
// needs api.get to resolve rather than hit the real (absent) indexer.
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      PROGRAMS: (id: string) => `/communities/${id}/programs`,
    },
    V2: {
      COMMUNITIES: {
        PROGRAMS: (uidOrSlug: string) => `/v2/communities/${uidOrSlug}/programs`,
      },
    },
  },
}));

// Inner component mocks
vi.mock("@/components/CommunityGrants", () => ({
  CommunityGrants: () => <div data-testid="community-grants">CommunityGrants</div>,
}));

vi.mock("@/components/CommunityGrantsDonate", () => ({
  CommunityGrantsDonate: () => <div data-testid="community-grants-donate">Donate</div>,
}));

vi.mock("@/components/Manage/DashboardOverview", () => ({
  DashboardOverview: () => <div data-testid="dashboard-overview">DashboardOverview</div>,
}));

vi.mock("@/components/Pages/Admin/KycSettingsPage", () => ({
  KycSettingsPage: () => <div data-testid="kyc-settings-page">KycSettingsPage</div>,
}));

vi.mock("@/components/Pages/Admin/KnowledgeBasePage/KnowledgeBasePage", () => ({
  KnowledgeBasePage: () => <div data-testid="knowledge-base-page">KnowledgeBase</div>,
}));

vi.mock("@/components/Pages/Admin/NotificationSettingsPage", () => ({
  NotificationSettingsPage: () => (
    <div data-testid="notification-settings-page">NotificationSettings</div>
  ),
}));

vi.mock("@/components/Pages/Admin/PortfolioReports/PortfolioReportListPage", () => ({
  PortfolioReportListPage: () => (
    <div data-testid="portfolio-report-list-page">PortfolioReportList</div>
  ),
}));

vi.mock("@/components/Pages/Admin/PortfolioReports/PortfolioReportEditorPage", () => ({
  PortfolioReportEditorPage: () => (
    <div data-testid="portfolio-report-editor-page">PortfolioReportEditor</div>
  ),
}));

vi.mock("@/components/Pages/Admin/PortfolioReports/PortfolioReportPreviewPage", () => ({
  PortfolioReportPreviewPage: () => (
    <div data-testid="portfolio-report-preview-page">PortfolioReportPreview</div>
  ),
}));

vi.mock("@/components/Pages/Admin/PortfolioReports/ReportConfigPage", () => ({
  ReportConfigPage: () => <div data-testid="report-config-page">ReportConfig</div>,
}));

vi.mock("@/components/Pages/Admin/ReportMilestonePage", () => ({
  ReportMilestonePage: () => <div data-testid="report-milestone-page">ReportMilestone</div>,
}));

vi.mock("@/components/Pages/Communities/TracksAdminPage", () => ({
  TracksAdminPage: () => <div data-testid="tracks-admin-page">TracksAdmin</div>,
}));

vi.mock("@/components/Pages/Community/PortfolioReports/PublicReportListPage", () => ({
  PublicReportListPage: () => <div data-testid="public-report-list-page">PublicReportList</div>,
}));

vi.mock("@/components/Pages/Community/PortfolioReports/PublicReportViewPage", () => ({
  PublicReportViewPage: () => <div data-testid="public-report-view-page">PublicReportView</div>,
}));

const isAsyncComponent = (type: unknown): type is (props: unknown) => Promise<React.ReactNode> =>
  typeof type === "function" && type.constructor?.name === "AsyncFunction";

/**
 * Walk a server-component tree far enough to render it with the client
 * renderer: unwrap Suspense boundaries and invoke async components (which the
 * client renderer cannot). Sync components are left alone so testing-library
 * renders them normally and the sentinel mocks still mount. Errors thrown by an
 * async component — notFound()'s NEXT_NOT_FOUND digest in particular —
 * propagate as a rejection of this promise.
 */
const resolveServerElement = async (node: React.ReactNode): Promise<React.ReactNode> => {
  if (!isValidElement(node)) return node;
  const element = node as React.ReactElement<{ children?: React.ReactNode }>;

  if (element.type === Suspense) {
    return resolveServerElement(element.props.children);
  }
  if (isAsyncComponent(element.type)) {
    return resolveServerElement(await element.type(element.props));
  }
  return element;
};

const renderAsyncPage = async (
  importer: () => Promise<{
    default: (props: unknown) => React.ReactElement | Promise<React.ReactElement>;
  }>,
  props: unknown
) => {
  const { default: Page } = await importer();
  const resolved = await resolveServerElement(await Page(props));
  return render(resolved);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Community async server pages — happy path", () => {
  it("/manage renders DashboardOverview", async () => {
    await renderAsyncPage(() => import("@/app/community/[communityId]/manage/page"), {
      params: Promise.resolve({ communityId: "c1" }),
    });
    expect(screen.getByTestId("dashboard-overview")).toBeInTheDocument();
  });

  it("/manage/knowledge-base renders KnowledgeBasePage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/manage/knowledge-base/page"),
      { params: Promise.resolve({ communityId: "c1" }) }
    );
    expect(screen.getByTestId("knowledge-base-page")).toBeInTheDocument();
  });

  it("/manage/kyc-settings renders KycSettingsPage", async () => {
    await renderAsyncPage(() => import("@/app/community/[communityId]/manage/kyc-settings/page"), {
      params: Promise.resolve({ communityId: "c1" }),
    });
    expect(screen.getByTestId("kyc-settings-page")).toBeInTheDocument();
  });

  it("/admin/kyc-settings renders KycSettingsPage", async () => {
    await renderAsyncPage(() => import("@/app/community/[communityId]/admin/kyc-settings/page"), {
      params: Promise.resolve({ communityId: "c1" }),
    });
    expect(screen.getByTestId("kyc-settings-page")).toBeInTheDocument();
  });

  it("/manage/notification-settings renders NotificationSettingsPage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/manage/notification-settings/page"),
      { params: Promise.resolve({ communityId: "c1" }) }
    );
    expect(screen.getByTestId("notification-settings-page")).toBeInTheDocument();
  });

  it("/manage/portfolio-reports renders PortfolioReportListPage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/manage/portfolio-reports/page"),
      { params: Promise.resolve({ communityId: "c1" }) }
    );
    expect(screen.getByTestId("portfolio-report-list-page")).toBeInTheDocument();
  });

  it("/manage/portfolio-reports/config renders ReportConfigPage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/manage/portfolio-reports/config/page"),
      { params: Promise.resolve({ communityId: "c1" }) }
    );
    expect(screen.getByTestId("report-config-page")).toBeInTheDocument();
  });

  it("/manage/portfolio-reports/[reportId] renders editor", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/manage/portfolio-reports/[reportId]/page"),
      { params: Promise.resolve({ communityId: "c1", reportId: "r1" }) }
    );
    expect(screen.getByTestId("portfolio-report-editor-page")).toBeInTheDocument();
  });

  it("/manage/portfolio-reports/[reportId]/preview renders preview", async () => {
    await renderAsyncPage(
      () =>
        import("@/app/community/[communityId]/manage/portfolio-reports/[reportId]/preview/page"),
      { params: Promise.resolve({ communityId: "c1", reportId: "r1" }) }
    );
    expect(screen.getByTestId("portfolio-report-preview-page")).toBeInTheDocument();
  });

  it("/manage/tracks renders TracksAdminPage", async () => {
    await renderAsyncPage(() => import("@/app/community/[communityId]/manage/tracks/page"), {
      params: Promise.resolve({ communityId: "c1" }),
    });
    expect(screen.getByTestId("tracks-admin-page")).toBeInTheDocument();
  });

  it("/manage/milestones-report renders ReportMilestonePage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/manage/milestones-report/page"),
      { params: Promise.resolve({ communityId: "c1" }) }
    );
    expect(screen.getByTestId("report-milestone-page")).toBeInTheDocument();
  });

  it("/(with-header)/projects renders CommunityGrants", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/(with-header)/projects/page"),
      { params: Promise.resolve({ communityId: "c1" }) }
    );
    expect(screen.getByTestId("community-grants")).toBeInTheDocument();
  });

  it("/(cover)/reports renders PublicReportListPage", async () => {
    await renderAsyncPage(() => import("@/app/community/[communityId]/(cover)/reports/page"), {
      params: Promise.resolve({ communityId: "c1" }),
    });
    expect(screen.getByTestId("public-report-list-page")).toBeInTheDocument();
  });

  it("/(cover)/reports/[runDate] renders PublicReportViewPage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/(cover)/reports/[runDate]/page"),
      { params: Promise.resolve({ communityId: "c1", runDate: "2025-04-01" }) }
    );
    expect(screen.getByTestId("public-report-view-page")).toBeInTheDocument();
  });

  it("/donate/[programId] renders CommunityGrantsDonate", async () => {
    await renderAsyncPage(() => import("@/app/community/[communityId]/donate/[programId]/page"), {
      params: Promise.resolve({ communityId: "c1", programId: "p1" }),
    });
    expect(screen.getByTestId("community-grants-donate")).toBeInTheDocument();
  });
});

describe("Community async server pages — runDate route validation", () => {
  const mockNotFoundThrow = async () => {
    const navigation = await import("next/navigation");
    const notFoundMock = vi.mocked(navigation.notFound);
    notFoundMock.mockImplementationOnce(() => {
      const err = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
      err.digest = "NEXT_NOT_FOUND";
      throw err;
    });
    return notFoundMock;
  };

  it("/(cover)/reports/[runDate] calls notFound for invalid runDate", async () => {
    const notFoundMock = await mockNotFoundThrow();
    const { default: Page } = await import(
      "@/app/community/[communityId]/(cover)/reports/[runDate]/page"
    );
    await expect(
      resolveServerElement(
        Page({ params: Promise.resolve({ communityId: "c1", runDate: "not-a-date" }) })
      )
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("/(cover)/reports/[runDate]/[configSlug] calls notFound for invalid runDate", async () => {
    const notFoundMock = await mockNotFoundThrow();
    const { default: Page } = await import(
      "@/app/community/[communityId]/(cover)/reports/[runDate]/[configSlug]/page"
    );
    await expect(
      resolveServerElement(
        Page({
          params: Promise.resolve({
            communityId: "c1",
            runDate: "not-a-date",
            configSlug: "quarterly",
          }),
        })
      )
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("/(cover)/reports/[runDate]/[configSlug] calls notFound for invalid configSlug", async () => {
    const notFoundMock = await mockNotFoundThrow();
    const { default: Page } = await import(
      "@/app/community/[communityId]/(cover)/reports/[runDate]/[configSlug]/page"
    );
    await expect(
      resolveServerElement(
        Page({
          params: Promise.resolve({
            communityId: "c1",
            runDate: "2025-04-01",
            configSlug: "not a slug!",
          }),
        })
      )
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("/(cover)/reports/[runDate]/[configSlug] renders for valid segments", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/(cover)/reports/[runDate]/[configSlug]/page"),
      {
        params: Promise.resolve({
          communityId: "c1",
          runDate: "2025-04-01",
          configSlug: "quarterly",
        }),
      }
    );
    expect(screen.getByTestId("public-report-view-page")).toBeInTheDocument();
  });
});
