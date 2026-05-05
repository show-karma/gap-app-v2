import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortfolioReportListPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportListPage";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  useGenerateReport,
  usePortfolioReports,
  usePublishReport,
  useRegenerateReport,
  useReportConfigs,
  useReportRowSync,
  useUnpublishReport,
} from "@/hooks/portfolio-reports/usePortfolioReports";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess");
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");

const mockUseCommunityAdminAccess = vi.mocked(useCommunityAdminAccess);
const mockUsePortfolioReports = vi.mocked(usePortfolioReports);
const mockUseGenerateReport = vi.mocked(useGenerateReport);
const mockUsePublishReport = vi.mocked(usePublishReport);
const mockUseUnpublishReport = vi.mocked(useUnpublishReport);
const mockUseRegenerateReport = vi.mocked(useRegenerateReport);
const mockUseReportConfigs = vi.mocked(useReportConfigs);
const mockUseReportRowSync = vi.mocked(useReportRowSync);

describe("PortfolioReportListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCommunityAdminAccess.mockReturnValue({
      hasAccess: true,
      isLoading: false,
    } as any);

    mockUseGenerateReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUsePublishReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseUnpublishReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseRegenerateReport.mockReturnValue({ isPending: false, mutateAsync: vi.fn() } as any);
    mockUseReportConfigs.mockReturnValue({ data: [], isLoading: false } as any);
    // Return the initialReport passed as the second argument
    mockUseReportRowSync.mockImplementation((_slug, initialReport) => initialReport);
  });

  it("shows a Preview action for draft reports and navigates to the admin preview page", async () => {
    const user = userEvent.setup();

    mockUsePortfolioReports.mockReturnValue({
      data: [
        {
          id: "draft-report",
          reportConfigId: "config-1",
          communityId: "community-1",
          runDate: "2026-03-15",
          status: "draft",
          markdown: "# Draft report",
          dataSnapshot: {},
          modelId: "gpt-4.1",
          tokenUsage: null,
          generatedAt: "2026-04-01T00:00:00.000Z",
          generationError: null,
          publishedAt: null,
          publishedBy: null,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      isLoading: false,
    } as any);

    render(
      <PortfolioReportListPage
        community={{ uid: "community-1", details: { slug: "filecoin", name: "Filecoin" } } as any}
      />
    );

    await user.click(screen.getByRole("button", { name: /preview/i }));

    expect(mockPush).toHaveBeenCalledWith(
      "/community/filecoin/manage/portfolio-reports/draft-report/preview"
    );
  });

  it("does not show a Preview action for published reports", () => {
    mockUsePortfolioReports.mockReturnValue({
      data: [
        {
          id: "published-report",
          reportConfigId: "config-1",
          communityId: "community-1",
          runDate: "2026-03-15",
          status: "published",
          markdown: "# Published report",
          dataSnapshot: {},
          modelId: "gpt-4.1",
          tokenUsage: null,
          generatedAt: "2026-04-01T00:00:00.000Z",
          generationError: null,
          publishedAt: "2026-04-02T00:00:00.000Z",
          publishedBy: "user-1",
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
      ],
      isLoading: false,
    } as any);

    render(
      <PortfolioReportListPage
        community={{ uid: "community-1", details: { slug: "filecoin", name: "Filecoin" } } as any}
      />
    );

    expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument();
  });
});
