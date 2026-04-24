import { render, screen } from "@testing-library/react";
import { PortfolioReportPreviewPage } from "@/components/Pages/Admin/PortfolioReports/PortfolioReportPreviewPage";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { usePortfolioReport } from "@/hooks/portfolio-reports/usePortfolioReports";

vi.mock("@/hooks/communities/useCommunityAdminAccess");
vi.mock("@/hooks/portfolio-reports/usePortfolioReports");
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

const mockUseCommunityAdminAccess = useCommunityAdminAccess as vi.MockedFunction<
  typeof useCommunityAdminAccess
>;
const mockUsePortfolioReport = usePortfolioReport as vi.MockedFunction<typeof usePortfolioReport>;

describe("PortfolioReportPreviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCommunityAdminAccess.mockReturnValue({
      hasAccess: true,
      isLoading: false,
    } as any);
  });

  it("renders the draft report in preview mode with a back link to admin portfolio reports", () => {
    mockUsePortfolioReport.mockReturnValue({
      data: {
        id: "draft-report",
        reportConfigId: "config-1",
        communityId: "community-1",
        reportMonth: "2026-03",
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
      },
      isLoading: false,
    } as any);

    render(
      <PortfolioReportPreviewPage
        community={{ uid: "community-1", details: { slug: "filecoin", name: "Filecoin" } } as any}
        reportId="draft-report"
      />
    );

    expect(screen.getByText(/preview mode/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to portfolio reports/i })).toHaveAttribute(
      "href",
      "/community/filecoin/manage/portfolio-reports"
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("# Draft report body");
  });
});
