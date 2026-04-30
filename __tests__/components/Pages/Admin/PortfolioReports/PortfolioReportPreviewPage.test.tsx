import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortfolioReportPreviewPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportPreviewPage";
import { usePortfolioReport } from "@/hooks/portfolio-reports/usePortfolioReports";

vi.mock("@/hooks/portfolio-reports/usePortfolioReports");
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

const mockUsePortfolioReport = vi.mocked(usePortfolioReport);

const community = {
  uid: "community-1",
  details: { slug: "filecoin", name: "Filecoin" },
} as any;

const draftReport = {
  id: "draft-report",
  reportConfigId: "config-1",
  communityId: "community-1",
  runDate: "2026-03-15",
  status: "draft",
  markdown: "# Draft report body",
  dataSnapshot: {},
  modelId: "gpt-4.1",
  tokenUsage: null,
  generatedAt: "2026-04-01T00:00:00.000Z",
  generationError: null,
  publishedAt: null,
  publishedBy: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};

const publishedReport = {
  ...draftReport,
  id: "published-report",
  status: "published",
  publishedAt: "2026-04-02T00:00:00.000Z",
  publishedBy: "user-1",
};

describe("PortfolioReportPreviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("renders a spinner while the report is loading", () => {
      mockUsePortfolioReport.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      const { container } = render(
        <PortfolioReportPreviewPage community={community} reportId="draft-report" />
      );

      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders a retry button that re-fetches the report", async () => {
      const user = userEvent.setup();
      const refetch = vi.fn();
      mockUsePortfolioReport.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch,
      } as any);

      render(<PortfolioReportPreviewPage community={community} reportId="draft-report" />);

      expect(screen.getByText(/failed to load the report preview/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /back to portfolio reports/i })).toHaveAttribute(
        "href",
        "/community/filecoin/manage/portfolio-reports"
      );

      await user.click(screen.getByRole("button", { name: /retry/i }));

      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("not found state", () => {
    it("shows a not-found message with a back link when the report does not exist", () => {
      mockUsePortfolioReport.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as any);

      render(<PortfolioReportPreviewPage community={community} reportId="missing-report" />);

      expect(screen.getByText(/report not found/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /back to portfolio reports/i })).toHaveAttribute(
        "href",
        "/community/filecoin/manage/portfolio-reports"
      );
    });
  });

  describe("success state", () => {
    it("renders the draft report in preview mode with a back link to admin portfolio reports", () => {
      mockUsePortfolioReport.mockReturnValue({
        data: draftReport,
        isLoading: false,
      } as any);

      render(<PortfolioReportPreviewPage community={community} reportId="draft-report" />);

      expect(
        screen.getByText(/preview mode — this draft is only visible to community admins\./i)
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /back to portfolio reports/i })).toHaveAttribute(
        "href",
        "/community/filecoin/manage/portfolio-reports"
      );
      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByTestId("markdown-preview")).toHaveTextContent("# Draft report body");
    });

    it("uses a neutral preview banner for already-published reports", () => {
      mockUsePortfolioReport.mockReturnValue({
        data: publishedReport,
        isLoading: false,
      } as any);

      render(<PortfolioReportPreviewPage community={community} reportId="published-report" />);

      expect(screen.getByText(/preview mode — admin view of this report\./i)).toBeInTheDocument();
      expect(
        screen.queryByText(/this draft is only visible to community admins/i)
      ).not.toBeInTheDocument();
    });
  });
});
