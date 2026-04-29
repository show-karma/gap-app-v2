import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

/**
 * Smoke tests for async server-rendered community pages. Pattern:
 *  1. Mock the data-fetching helpers (getCommunityDetails etc.) so the page
 *     can resolve without the network.
 *  2. Mock the inner page-component import with a sentinel.
 *  3. Invoke the page as `await Page({ params: Promise.resolve({...}) })`.
 *  4. render() the returned element and check the sentinel is mounted.
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

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue([null, null]),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      PROGRAMS: (id: string) => `/communities/${id}/programs`,
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

const renderAsyncPage = async (
  importer: () => Promise<{ default: (props: unknown) => Promise<React.ReactElement> }>,
  props: unknown
) => {
  const { default: Page } = await importer();
  const result = await Page(props);
  return render(result);
};

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

  it("/(with-header)/reports renders PublicReportListPage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/(with-header)/reports/page"),
      { params: Promise.resolve({ communityId: "c1" }) }
    );
    expect(screen.getByTestId("public-report-list-page")).toBeInTheDocument();
  });

  it("/(with-header)/reports/[month] renders PublicReportViewPage", async () => {
    await renderAsyncPage(
      () => import("@/app/community/[communityId]/(with-header)/reports/[month]/page"),
      { params: Promise.resolve({ communityId: "c1", month: "2025-04" }) }
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

describe("Community async server pages — month route validation", () => {
  it("/(with-header)/reports/[month] calls notFound for invalid month", async () => {
    const navigation = await import("next/navigation");
    (navigation.notFound as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      const err = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
      err.digest = "NEXT_NOT_FOUND";
      throw err;
    });
    const { default: Page } = await import(
      "@/app/community/[communityId]/(with-header)/reports/[month]/page"
    );
    await expect(
      Page({ params: Promise.resolve({ communityId: "c1", month: "not-a-month" }) })
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
  });
});
