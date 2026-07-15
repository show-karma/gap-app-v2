import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortfolioReportPreviewPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportPreviewPage";
import { usePortfolioReport } from "@/hooks/portfolio-reports/usePortfolioReports";

// DEV-496: the preview route is now a redirect shim to the unified public URL
// (/community/:slug/reports/:runDate), where a community admin sees the draft.
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");

const mockUsePortfolioReport = vi.mocked(usePortfolioReport);

const community = {
  uid: "community-1",
  details: { slug: "filecoin", name: "Filecoin" },
} as any;

const draftReport = {
  id: "draft-report",
  runDate: "2026-03-15",
  status: "draft",
  publishedAt: null,
} as any;

describe("PortfolioReportPreviewPage (redirect shim)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a spinner while the report is loading and does not redirect yet", () => {
    mockUsePortfolioReport.mockReturnValue({ data: undefined, isLoading: true } as any);

    const { container } = render(
      <PortfolioReportPreviewPage community={community} reportId="draft-report" />
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the unified public report URL once the report resolves", () => {
    mockUsePortfolioReport.mockReturnValue({ data: draftReport, isLoading: false } as any);

    render(<PortfolioReportPreviewPage community={community} reportId="draft-report" />);

    expect(replace).toHaveBeenCalledWith("/community/filecoin/reports/2026-03-15");
  });

  it("renders a retry button that re-fetches on error and does not redirect", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockUsePortfolioReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as any);

    render(<PortfolioReportPreviewPage community={community} reportId="draft-report" />);

    expect(screen.getByText(/failed to load the report/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to portfolio reports/i })).toHaveAttribute(
      "href",
      "/community/filecoin/manage/portfolio-reports"
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a not-found message when the report does not exist", () => {
    mockUsePortfolioReport.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as any);

    render(<PortfolioReportPreviewPage community={community} reportId="missing-report" />);

    expect(screen.getByText(/report not found/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
